import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { salesAPI, categoryAPI, boxTypeAPI, paymentAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/Spinner'
import { useLanguage } from '../../context/LanguageContext'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

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
  const [typeFilter, setTypeFilter] = useState('all') // all | mango | box
  const [menuOpen, setMenuOpen] = useState(null) // sale id with open menu
  const [payModal, setPayModal] = useState(null) // sale object for payment modal
  const [payForm, setPayForm] = useState({ paid_amount: '0', due_date: '' })
  const [paying, setPaying] = useState(false)

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

  useEffect(() => { load() }, [])

  // Unique employees for filter tabs
  const empMap = {}
  ;(Array.isArray(sales) ? sales : []).forEach(s => { if (s.employee_id) empMap[s.employee_id] = s.employee_username || `Emp #${s.employee_id}` })

  const filtered = sales.filter(s => {
    const matchEmp = empFilter === 'all' || String(s.employee_id) === empFilter
    const matchType = typeFilter === 'all'
      || (typeFilter === 'mango' && s.mango_category_id)
      || (typeFilter === 'box' && s.box_type_id && !s.mango_category_id)
    const matchSearch =
      (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.vehicle_number || '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.id).includes(search) ||
      (s.employee_username || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name || '').toLowerCase().includes(search.toLowerCase())
    return matchEmp && matchType && matchSearch
  })

  const totalAmt = filtered.reduce((sum, s) => sum + s.total_amount, 0)
  const totalBoxes = filtered.reduce((sum, s) => sum + (s.quantity || 0), 0)

  const handleAddPayment = async () => {
    if (!payModal || !payForm.due_date) { toast.error('Due date dalo'); return }
    setPaying(true)
    try {
      await paymentAPI.create({
        sale_id: payModal.id,
        due_date: payForm.due_date,
        paid_amount: parseFloat(payForm.paid_amount) || 0,
      })
      toast.success('Payment record ban gaya! Reminder bhi set ho gaya ✅')
      setPayModal(null)
      setPayForm({ paid_amount: '0', due_date: '' })
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to add payment')
    } finally { setPaying(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="pb-24" onClick={() => setMenuOpen(null)}>
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
          placeholder="Search by city, vehicle, order #, customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Type filter tabs */}
        <div className="flex gap-2">
          {[['all', 'All'], ['mango', '🥭 Mango'], ['box', '📦 Box Only']].map(([v, label]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${typeFilter === v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

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
              <div key={s.id} className="card active:scale-[0.98] transition-all cursor-pointer relative"
                onClick={() => navigate(`/sales/${s.id}`)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">Order #{s.id}</p>
                      {s.size && <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-semibold">{s.size}</span>}
                    </div>
                    {cat && <p className="text-xs text-gray-500">{cat.name} — Grade {cat.category_number}</p>}
                    {box && <p className="text-xs text-mango-600 font-medium">📦 {box.brand_name} • {box.size} • {box.box_weight}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-extrabold text-primary-700">{fmtMoney(s.total_amount)}</p>
                    {/* 3-dot menu */}
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-all"
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id) }}>
                      ⋮
                    </button>
                  </div>
                </div>

                {/* Dropdown menu */}
                {menuOpen === s.id && (
                  <div className="absolute top-10 right-4 z-50 bg-white shadow-xl rounded-xl border border-gray-100 py-1 min-w-[160px]"
                    onClick={e => e.stopPropagation()}>
                    <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => { navigate(`/sales/${s.id}`); setMenuOpen(null) }}>
                      👁 View Details
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 flex items-center gap-2"
                      onClick={() => { setPayModal(s); setMenuOpen(null) }}>
                      💰 Add Payment
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                      onClick={() => { navigate('/reminders'); setMenuOpen(null) }}>
                      ⏰ Reminders
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 my-2">
                  {s.quantity && (
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">🥭 Mango Qty</p>
                      <p className="text-sm font-bold text-gray-800">{s.quantity} boxes × ₹{s.price_per_box}</p>
                    </div>
                  )}
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
                      <span>🧑</span>
                      <span>{s.customer_name}{s.customer_village ? ` — ${s.customer_village}` : ''}</span>
                      {s.customer_phone && <span className="text-gray-400">• {s.customer_phone}</span>}
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

      {/* Add Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setPayModal(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">💰 Add Payment</h2>
              <button onClick={() => setPayModal(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="bg-primary-50 rounded-xl px-4 py-3">
              <p className="text-xs text-primary-600">Order #{payModal.id} — {payModal.customer_name || 'Customer'}</p>
              <p className="text-lg font-extrabold text-primary-700">Total: ₹{payModal.total_amount?.toLocaleString()}</p>
            </div>
            <div>
              <label className="label">Amount Received ₹ (0 if not received yet)</label>
              <input className="input-field" type="number" placeholder="0"
                value={payForm.paid_amount}
                onChange={e => setPayForm(f => ({ ...f, paid_amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment Due Date *</label>
              <input type="datetime-local" className="input-field"
                value={payForm.due_date}
                onChange={e => setPayForm(f => ({ ...f, due_date: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">1 din pehle reminder automatic ban jayega</p>
            </div>
            <button onClick={handleAddPayment} disabled={paying} className="btn-primary w-full">
              {paying ? 'Saving...' : '✅ Save Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
