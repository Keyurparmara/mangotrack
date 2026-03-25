import { useEffect, useState } from 'react'
import { paymentAPI, salesAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

export default function Payments() {
  const { user } = useAuth()
  const { fmtMoney, fmtDate } = useLanguage()
  const [payments, setPayments] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [payNowId, setPayNowId] = useState(null)   // which payment is being paid
  const [addAmount, setAddAmount] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ sale_id: '', due_date: '', paid_amount: '0' })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, sRes] = await Promise.allSettled([paymentAPI.list(), salesAPI.list()])
      setPayments(Array.isArray(pRes.value?.data) ? pRes.value.data : [])
      setSales(Array.isArray(sRes.value?.data) ? sRes.value.data : [])
    } finally { setLoading(false) }
  }

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter)

  // "Pay Now" — adds to existing paid amount
  const handlePayNow = async (payment) => {
    const amt = parseFloat(addAmount)
    if (!amt || amt <= 0) { toast.error('Amount dalo'); return }
    if (amt > payment.remaining_amount) {
      toast.error(`Sirf ₹${payment.remaining_amount.toFixed(0)} baki hai`); return
    }
    setSaving(true)
    try {
      await paymentAPI.update(payment.id, {
        add_amount: amt,
        due_date: newDueDate || undefined,
      })
      toast.success(`₹${amt.toLocaleString()} add ho gaya! ✅`)
      setPayNowId(null)
      setAddAmount('')
      setNewDueDate('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleCreate = async () => {
    if (!createForm.sale_id || !createForm.due_date) { toast.error('Sale aur due date dalo'); return }
    setSaving(true)
    try {
      await paymentAPI.create({
        sale_id: parseInt(createForm.sale_id),
        due_date: createForm.due_date,
        paid_amount: parseFloat(createForm.paid_amount || 0),
      })
      toast.success('Payment record ban gaya!')
      setShowCreate(false)
      setCreateForm({ sale_id: '', due_date: '', paid_amount: '0' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const saleMap = {}
  sales.forEach(s => { saleMap[s.id] = s })

  if (loading) return <PageLoader />

  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.remaining_amount, 0)
  const overdueCount = payments.filter(p => p.status !== 'paid' && new Date(p.due_date) < new Date()).length

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
            <h1 className="text-2xl font-extrabold">Payments 💳</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95">
            {showCreate ? '← Back' : '+ New'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-xs text-primary-100">Total Baki</p>
            <p className="text-xl font-extrabold">{fmtMoney(totalPending)}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-xs text-primary-100">Overdue</p>
            <p className="text-xl font-extrabold text-red-300">{overdueCount}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Create new payment */}
        {showCreate && (
          <div className="card space-y-3">
            <p className="font-bold text-gray-900">New Payment Record</p>
            <div>
              <label className="label">Sale Select Karo</label>
              <select className="select-field" value={createForm.sale_id}
                onChange={e => setCreateForm({ ...createForm, sale_id: e.target.value })}>
                <option value="">-- Sale choose karo --</option>
                {sales.map(s => (
                  <option key={s.id} value={s.id}>
                    Sale #{s.id} — ₹{s.total_amount?.toLocaleString()} {s.customer_name ? `(${s.customer_name})` : ''} — {s.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Payment Due Date *</label>
              <input type="datetime-local" className="input-field" value={createForm.due_date}
                onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Abhi Kitna Mila ₹ (0 if pending)</label>
              <input type="number" className="input-field" placeholder="0"
                value={createForm.paid_amount}
                onChange={e => setCreateForm({ ...createForm, paid_amount: e.target.value })} />
            </div>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : '✅ Create Payment Record'}
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['all', 'pending', 'partial', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ` +
                (filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500')}>
              {f === 'all' ? `All (${payments.length})` : `${f} (${payments.filter(p => p.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="💳" title="No payments found"
            subtitle={filter !== 'all' ? `No ${filter} payments` : 'Create a payment record for a sale'} />
        ) : (
          filtered.map(p => {
            const sale = saleMap[p.sale_id]
            const isOverdue = new Date(p.due_date) < new Date() && p.status !== 'paid'
            const pct = (p.paid_amount / p.total_amount) * 100

            return (
              <div key={p.id} className={`card border-l-4 ${isOverdue ? 'border-red-400' : p.status === 'paid' ? 'border-green-400' : 'border-amber-400'}`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">
                      {sale?.customer_name || `Sale #${p.sale_id}`}
                    </p>
                    {sale?.customer_name && (
                      <p className="text-xs text-gray-400">Sale #{p.sale_id} • {sale?.city}</p>
                    )}
                    <p className={`text-xs font-semibold mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                      {isOverdue ? '⚠️ Overdue — ' : '📅 Due: '}
                      {fmtDate(p.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border capitalize ${
                    p.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                    p.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>{p.status}</span>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-2 my-3">
                  {[
                    { label: 'Total', value: p.total_amount, color: 'text-gray-700' },
                    { label: 'Mila', value: p.paid_amount, color: 'text-green-600' },
                    { label: 'Baki', value: p.remaining_amount, color: p.remaining_amount > 0 ? 'text-red-500' : 'text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{fmtMoney(s.value)}</p>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="bg-gray-100 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all ${p.status === 'paid' ? 'bg-green-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 text-right -mt-2 mb-2">{pct.toFixed(0)}% mila</p>

                {/* Pay Now section */}
                {p.status !== 'paid' && (
                  payNowId === p.id ? (
                    <div className="bg-green-50 rounded-xl p-3 space-y-2 border border-green-200">
                      <p className="text-xs font-bold text-green-800">
                        Baki: {fmtMoney(p.remaining_amount)} — Abhi kitna mila?
                      </p>
                      <input
                        type="number"
                        className="input-field"
                        placeholder={`Max ₹${p.remaining_amount.toFixed(0)}`}
                        value={addAmount}
                        onChange={e => setAddAmount(e.target.value)}
                        autoFocus
                      />
                      {/* Quick fill buttons */}
                      <div className="flex gap-2">
                        <button onClick={() => setAddAmount(String(p.remaining_amount))}
                          className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold">
                          Full {fmtMoney(p.remaining_amount)}
                        </button>
                        {p.remaining_amount > 1000 && (
                          <button onClick={() => setAddAmount(String(Math.round(p.remaining_amount / 2)))}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold">
                            Half
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="label text-xs">Due Date Change Karo (Optional)</label>
                        <input type="datetime-local" className="input-field"
                          value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePayNow(p)} disabled={saving}
                          className="btn-primary flex-1 py-2 text-sm">
                          {saving ? 'Saving...' : '✅ Payment Add Karo'}
                        </button>
                        <button onClick={() => { setPayNowId(null); setAddAmount(''); setNewDueDate('') }}
                          className="flex-1 py-2 text-sm bg-gray-100 rounded-xl font-semibold text-gray-600">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPayNowId(p.id); setAddAmount(''); setNewDueDate('') }}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                        isOverdue
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                      💰 Pay Now — {fmtMoney(p.remaining_amount)} baki
                    </button>
                  )
                )}

                {p.status === 'paid' && (
                  <div className="text-center py-2 text-green-600 font-bold text-sm">
                    ✅ Pura payment aa gaya!
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
