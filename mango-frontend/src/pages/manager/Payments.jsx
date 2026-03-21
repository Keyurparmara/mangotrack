import { useEffect, useState } from 'react'
import { paymentAPI, salesAPI } from '../../api/api'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

export default function Payments() {
  const { fmtMoney, fmtDate } = useLanguage()
  const [payments, setPayments] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ paid_amount: '', due_date: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ sale_id: '', due_date: '', paid_amount: '0' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, sRes] = await Promise.allSettled([paymentAPI.list(), salesAPI.list()])
      setPayments(pRes.value?.data || [])
      setSales(sRes.value?.data || [])
    } finally { setLoading(false) }
  }

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter)

  const handleUpdate = async (id) => {
    if (!editForm.paid_amount) { toast.error('Enter paid amount'); return }
    setSaving(true)
    try {
      await paymentAPI.update(id, {
        paid_amount: parseFloat(editForm.paid_amount),
        due_date: editForm.due_date || undefined,
      })
      toast.success('Payment updated!')
      setEditId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleCreate = async () => {
    if (!createForm.sale_id || !createForm.due_date) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      await paymentAPI.create({
        sale_id: parseInt(createForm.sale_id),
        due_date: createForm.due_date,
        paid_amount: parseFloat(createForm.paid_amount || 0),
      })
      toast.success('Payment created!')
      setShowCreate(false)
      setCreateForm({ sale_id: '', due_date: '', paid_amount: '0' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />

  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.remaining_amount, 0)

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-primary-100 text-sm">Manager</p>
            <h1 className="text-2xl font-extrabold">Payments 💳</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95">
            {showCreate ? '← Back' : '+ New'}
          </button>
        </div>
        <div className="mt-4 bg-white/15 rounded-2xl p-3 flex justify-between">
          <div><p className="text-xs text-primary-100">Total Pending</p><p className="text-xl font-extrabold">{fmtMoney(totalPending)}</p></div>
          <div className="text-right"><p className="text-xs text-primary-100">Overdue Items</p><p className="text-xl font-extrabold">{payments.filter(p => p.status !== 'paid' && new Date(p.due_date) < new Date()).length}</p></div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {showCreate && (
          <div className="card space-y-3">
            <p className="font-bold text-gray-900">Create Payment</p>
            <div>
              <label className="label">Sale</label>
              <select className="select-field" value={createForm.sale_id} onChange={e => setCreateForm({ ...createForm, sale_id: e.target.value })}>
                <option value="">Select Sale</option>
                {sales.map(s => <option key={s.id} value={s.id}>Sale #{s.id} — ₹{s.total_amount} ({s.city})</option>)}
              </select>
            </div>
            <div><label className="label">Due Date</label><input type="datetime-local" className="input-field" value={createForm.due_date} onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })} /></div>
            <div><label className="label">Initial Paid Amount (₹)</label><input type="number" className="input-field" placeholder="0" value={createForm.paid_amount} onChange={e => setCreateForm({ ...createForm, paid_amount: e.target.value })} /></div>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Payment'}</button>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'pending', 'partial', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ` +
                (filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500')}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="💳" title="No payments found" />
        ) : (
          filtered.map(p => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-gray-900">Sale #{p.sale_id}</p>
                  <p className="text-xs text-gray-400">Due: {fmtDate(p.due_date)}</p>
                </div>
                <span className={p.status === 'paid' ? 'badge-paid' : p.status === 'partial' ? 'badge-partial' : 'badge-pending'}>
                  {p.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                {[
                  { label: 'Total', value: p.total_amount, color: 'text-gray-700' },
                  { label: 'Paid', value: p.paid_amount, color: 'text-green-600' },
                  { label: 'Remaining', value: p.remaining_amount, color: 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className={`text-sm font-bold ${s.color}`}>{fmtMoney(s.value)}</p>
                    <p className="text-[10px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="bg-gray-100 rounded-full h-1.5 mb-3">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(p.paid_amount / p.total_amount) * 100}%` }} />
              </div>

              {p.status !== 'paid' && (
                <>
                  {editId === p.id ? (
                    <div className="space-y-2 mt-2">
                      <input type="number" className="input-field" placeholder="Paid amount ₹" value={editForm.paid_amount}
                        onChange={e => setEditForm({ ...editForm, paid_amount: e.target.value })} />
                      <input type="datetime-local" className="input-field" value={editForm.due_date}
                        onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(p.id)} disabled={saving} className="btn-sm flex-1">{saving ? '...' : 'Update'}</button>
                        <button onClick={() => setEditId(null)} className="btn-danger flex-1">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(p.id); setEditForm({ paid_amount: p.paid_amount, due_date: '' }) }}
                      className="w-full text-center text-xs font-semibold text-primary-600 py-2 bg-primary-50 rounded-xl active:scale-95 transition-all">
                      Update Payment
                    </button>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
