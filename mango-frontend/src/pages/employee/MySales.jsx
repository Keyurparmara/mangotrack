import { useEffect, useState } from 'react'
import { salesAPI, categoryAPI } from '../../api/api'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'

export default function MySales() {
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { fmtMoney, fmtDate } = useLanguage()

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.allSettled([salesAPI.getMySales(), categoryAPI.list()])
        setSales(sRes.value?.data || [])
        const catMap = {}
        ;(cRes.value?.data || []).forEach(c => { catMap[c.id] = c })
        setCategories(catMap)
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = sales.filter(s =>
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    s.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    String(s.id).includes(search)
  )

  const totalAmt = sales.reduce((s, i) => s + i.total_amount, 0)
  const totalBoxes = sales.reduce((s, i) => s + i.quantity, 0)

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm">Employee</p>
        <h1 className="text-2xl font-extrabold">My Sales 📋</h1>
        <div className="flex gap-4 mt-3">
          <div className="bg-white/15 rounded-xl px-4 py-2">
            <p className="text-xs text-primary-100">Revenue</p>
            <p className="text-lg font-extrabold">{fmtMoney(totalAmt)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2">
            <p className="text-xs text-primary-100">Boxes Sold</p>
            <p className="text-lg font-extrabold">{totalBoxes}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2">
            <p className="text-xs text-primary-100">Orders</p>
            <p className="text-lg font-extrabold">{sales.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <input className="input-field" placeholder="🔍 Search by city, vehicle, order #..." value={search} onChange={e => setSearch(e.target.value)} />

        {filtered.length === 0 ? (
          sales.length === 0
            ? <EmptyState icon="🥭" title="No sales yet" subtitle="Tap + New Sale to create your first sale" />
            : <EmptyState icon="🔍" title="No results" subtitle={`No sales match "${search}"`} />
        ) : (
          filtered.slice().reverse().map(s => {
            const cat = categories[s.mango_category_id]
            return (
              <div key={s.id} className="card active:scale-[0.98] transition-all cursor-pointer"
                onClick={() => navigate(`/sales/${s.id}`)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">Order #{s.id}</p>
                      <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-semibold">{s.size}</span>
                    </div>
                    {cat && <p className="text-xs text-gray-500">{cat.name} — Grade {cat.category_number}</p>}
                  </div>
                  <p className="text-base font-extrabold text-primary-700">{fmtMoney(s.total_amount)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">🥭 Mango Qty</p>
                    <p className="text-sm font-bold text-gray-800">{s.quantity} boxes × ₹{s.price_per_box}</p>
                  </div>
                  {s.box_quantity && (
                    <div className="bg-mango-50 rounded-xl p-2">
                      <p className="text-[10px] text-mango-400 uppercase font-semibold">📦 Box Qty</p>
                      <p className="text-sm font-bold text-gray-800">{s.box_quantity} pcs × ₹{s.box_price_per_unit}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-50 space-y-1">
                  {s.customer_name && (
                    <div className="flex items-center gap-2 text-xs text-gray-700 font-semibold">
                      <span>🧑</span><span>{s.customer_name}{s.customer_village ? ` — ${s.customer_village}` : ''}</span>
                    </div>
                  )}
                  {s.transport_type && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>🚛</span><span>{s.transport_type}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>🚚</span><span>{s.vehicle_number} → {s.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>📤</span><span>{fmtDate(s.dispatch_time, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>📥</span><span>ETA: {fmtDate(s.expected_delivery_time, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <button onClick={() => navigate('/create-sale')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary-600 rounded-full text-2xl shadow-lg flex items-center justify-center active:scale-95 transition-all z-40">
        +
      </button>
    </div>
  )
}
