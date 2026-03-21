import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { partyAPI, purchasePaymentAPI } from '../../api/api'
import { PageLoader } from '../../components/Spinner'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

const statusBadge = {
  pending: 'bg-red-50 text-red-600 border border-red-200',
  partial: 'bg-amber-50 text-amber-700 border border-amber-200',
  paid: 'bg-green-50 text-green-700 border border-green-200',
}

export default function PartyDetail() {
  const { fmtMoney, fmtDate } = useLanguage()
  const { name } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addPayFor, setAddPayFor] = useState(null) // purchase id
  const [addTxnFor, setAddTxnFor] = useState(null) // purchase_payment id
  const [payForm, setPayForm] = useState({ total_amount: '', paid_amount: '', notes: '' })
  const [txnForm, setTxnForm] = useState({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    partyAPI.get(name)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load party'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [name])

  const handleCreatePayment = async (purchaseId) => {
    if (!payForm.total_amount) { toast.error('Total amount dalo'); return }
    setSaving(true)
    try {
      await purchasePaymentAPI.create({
        purchase_id: purchaseId,
        total_amount: parseFloat(payForm.total_amount),
        paid_amount: parseFloat(payForm.paid_amount) || 0,
        notes: payForm.notes || null,
      })
      toast.success('Payment record created!')
      setAddPayFor(null)
      setPayForm({ total_amount: '', paid_amount: '', notes: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleAddTxn = async (ppId) => {
    if (!txnForm.amount || !txnForm.paid_at) { toast.error('Amount aur date dalo'); return }
    setSaving(true)
    try {
      await purchasePaymentAPI.addTransaction(ppId, {
        amount: parseFloat(txnForm.amount),
        notes: txnForm.notes || null,
        paid_at: txnForm.paid_at,
      })
      toast.success('Payment added!')
      setAddTxnFor(null)
      setTxnForm({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />
  if (!data) return null

  return (
    <div className="pb-24">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="text-primary-100 text-sm mb-2">← Back</button>
        <h1 className="text-2xl font-extrabold">{data.company_name}</h1>
        <p className="text-primary-100 text-xs mt-1">{data.city_name}</p>
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <p className="text-xs text-primary-100">Total Owed</p>
            <p className="text-base font-extrabold">{fmtMoney(data.total_owed)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <p className="text-xs text-primary-100">Paid</p>
            <p className="text-base font-extrabold text-green-300">{fmtMoney(data.total_paid)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <p className="text-xs text-primary-100">Baki</p>
            <p className={`text-base font-extrabold ${data.total_remaining > 0 ? 'text-red-300' : 'text-green-300'}`}>
              {fmtMoney(data.total_remaining)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {data.purchases.map(p => (
          <div key={p.id} className="card space-y-3">
            {/* Purchase header */}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-900">Purchase #{p.id}</p>
                <p className="text-xs text-gray-500">{fmtDate(p.purchase_datetime)} • {p.vehicle_number}</p>
                <p className="text-xs text-gray-400">{p.unload_employee} ne unload kiya</p>
              </div>
              {p.payment && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${statusBadge[p.payment.status]}`}>
                  {p.payment.status}
                </span>
              )}
            </div>

            {/* Items */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {p.items.map(item => (
                <div key={item.id} className="flex justify-between text-xs text-gray-700">
                  <span>
                    {item.item_type === 'mango'
                      ? `Mango ${item.mango_category_name} ${item.size}`
                      : `Box ${item.box_brand}`}
                  </span>
                  <span className="font-semibold">{item.quantity} × {fmtMoney(item.price_per_unit)} = {fmtMoney(item.subtotal)}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-900">
                <span>Total</span>
                <span>{fmtMoney(p.items.reduce((s, i) => s + i.subtotal, 0))}</span>
              </div>
            </div>

            {/* Payment section */}
            {!p.payment ? (
              addPayFor === p.id ? (
                <div className="bg-primary-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-primary-700">Add Payment Record</p>
                  <input className="input-field" type="number" placeholder="Total amount to pay ₹"
                    value={payForm.total_amount} onChange={e => setPayForm(f => ({ ...f, total_amount: e.target.value }))} />
                  <input className="input-field" type="number" placeholder="Already paid ₹ (0 if none)"
                    value={payForm.paid_amount} onChange={e => setPayForm(f => ({ ...f, paid_amount: e.target.value }))} />
                  <input className="input-field" placeholder="Notes (optional)"
                    value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
                  <div className="flex gap-2">
                    <button onClick={() => handleCreatePayment(p.id)} disabled={saving} className="btn-primary flex-1 py-2 text-sm">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setAddPayFor(null)} className="flex-1 py-2 text-sm bg-gray-100 rounded-xl font-semibold">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddPayFor(p.id)} className="w-full py-2.5 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold border border-primary-200">
                  + Add Payment Record
                </button>
              )
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[
                    { label: 'Total', value: p.payment.total_amount, c: 'bg-gray-50 text-gray-700' },
                    { label: 'Paid', value: p.payment.paid_amount, c: 'bg-green-50 text-green-700' },
                    { label: 'Baki', value: p.payment.remaining_amount, c: p.payment.remaining_amount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700' },
                  ].map(s => (
                    <div key={s.label} className={`flex-1 ${s.c} rounded-xl py-2 px-2 text-center`}>
                      <p className="text-xs font-bold">{fmtMoney(s.value)}</p>
                      <p className="text-[10px]">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Payment transactions */}
                {p.payment.transactions.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-2 space-y-1">
                    <p className="text-xs font-bold text-green-800 mb-1">Payment History</p>
                    {p.payment.transactions.map(t => (
                      <div key={t.id} className="flex justify-between text-xs text-green-700">
                        <span>{fmtDate(t.paid_at)}{t.notes ? ` — ${t.notes}` : ''}</span>
                        <span className="font-bold">{fmtMoney(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add payment transaction */}
                {p.payment.remaining_amount > 0 && (
                  addTxnFor === p.payment.id ? (
                    <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-amber-700">Add Payment</p>
                      <input className="input-field" type="number" placeholder={`Amount (max ${fmtMoney(p.payment.remaining_amount)})`}
                        value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
                      <input type="datetime-local" className="input-field"
                        value={txnForm.paid_at} onChange={e => setTxnForm(f => ({ ...f, paid_at: e.target.value }))} />
                      <input className="input-field" placeholder="Notes (optional)"
                        value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={() => handleAddTxn(p.payment.id)} disabled={saving} className="btn-primary flex-1 py-2 text-sm">
                          {saving ? 'Saving...' : 'Add Payment'}
                        </button>
                        <button onClick={() => setAddTxnFor(null)} className="flex-1 py-2 text-sm bg-gray-100 rounded-xl font-semibold">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddTxnFor(p.payment.id); setTxnForm({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) }) }}
                      className="w-full py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200">
                      + Pay {fmtMoney(p.payment.remaining_amount)} Remaining
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
