import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { salesAPI, categoryAPI, boxTypeAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/Spinner'
import { useLanguage } from '../../context/LanguageContext'
import EmptyState from '../../components/EmptyState'

export default function AllSales() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { fmtMoney, fmtDate } = useLanguage()
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState({})
  const [boxTypes, setBoxTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [empFilter, setEmpFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes, bRes] = await Promise.allSettled([salesAPI.list(), categoryAPI.list(), boxTypeAPI.list()])
        setSales(Array.isArray(sRes.value?.data) ? sRes.value.data : [])
        const catMap = {}
        ;(Array.isArray(cRes.value?.data) ? cRes.value.data : []).forEach(c => { catMap[c.id] = c })
        setCategories(catMap)
        const boxMap = {}
        ;(Array.isArray(bRes.value?.data) ? bRes.value.data : []).forEach(b => { boxMap[b.id] = b })
        setBoxTypes(boxMap)
      } finally { setLoading(false) }
    }
    load()
  }, [])

  // Unique employees for filter tabs
  const empMap = {}
  ;(Array.isArray(sales) ? sales : []).forEach(s => { if (s.employee_id) empMap[s.employee_id] = s.employee_username || `Emp #${s.employee_id}` })

  const filtered = sales.filter(s => {
    const matchEmp = empFilter === 'all' || String(s.employee_id) === empFilter
    const matchSearch =
      (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.vehicle_number || '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.id).includes(search) ||
      (s.employee_username || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name || '').toLowerCase().includes(search.toLowerCase())
    return matchEmp && matchSearch
  })

  const totalAmt = filtered.reduce((sum, s) => sum + s.total_amount, 0)
  const totalBoxes = filtered.reduce((sum, s) => sum + s.quantity, 0)

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
        <h1 className="text-2xl font-extrabold">All Sales 🥭</h1>
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="bg-white/15 rounded-xl px-4 py-2">
            <p className="text-xs text-primary-100">Revenue</p>
            <p className="text-lg font-extrabold">{fmtMoney(totalAmt)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2">
            <p className="text-xs text-primary-100">Boxes</p>
            <p className="text-lg font-extrabold">{totalBoxes}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2">
            <p className="text-xs text-primary-100">Orders</p>
            <p className="text-lg font-extrabold">{filtered.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <input
          className="input-field"
          placeholder="🔍 Search by city, vehicle, order #, employee ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Employee filter tabs */}
        {Object.keys(empMap).length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => setEmpFilter('all')}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${empFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              Sabke Sales
            </button>
            {Object.entries(empMap).map(([id, name]) => (
              <button key={id} onClick={() => setEmpFilter(id)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${empFilter === id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {String(id) === String(user?.id) ? 'Aapne' : name}
              </button>
            ))}
          </div>
        )}

        {/* Sales list */}
        {filtered.length === 0 ? (
          sales.length === 0
            ? <EmptyState icon="🥭" title="No sales yet" subtitle="Sales created by employees will appear here" />
            : <EmptyState icon="🔍" title="No results" subtitle={`No sales match "${search}"`} />
        ) : (
          filtered.map(s => {
            const cat = categories[s.mango_category_id]
            const box = s.box_type_id ? boxTypes[s.box_type_id] : null
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
                    {box && <p className="text-xs text-mango-600 font-medium">📦 {box.brand_name} • {box.size} • {box.box_weight}</p>}
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
                  <div className={`flex items-center gap-2 text-xs font-semibold ${String(s.employee_id) === String(user?.id) ? 'text-primary-600' : 'text-gray-600'}`}>
                    <span>👤</span>
                    <span>{String(s.employee_id) === String(user?.id) ? '✅ Aapne kiya' : `${s.employee_username || 'Employee'} ne kiya`}</span>
                  </div>
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
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-2xl shadow-lg flex items-center justify-center active:scale-95 transition-all z-40 text-white"
        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 4px 12px rgba(22,163,74,0.40)' }}>
        +
      </button>
    </div>
  )
}
