import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { purchaseAPI, categoryAPI, boxTypeAPI, purchasePaymentAPI } from '../../api/api'
import { PageLoader } from '../../components/Spinner'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

const statusBadge = {
  pending: 'bg-red-50 text-red-600 border border-red-200',
  partial: 'bg-amber-50 text-amber-700 border border-amber-200',
  paid:    'bg-green-50 text-green-700 border border-green-200',
}

export default function PurchaseDetail() {
  const { fmtMoney, fmtNum, fmtDate, fmtDateTime } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [purchase, setPurchase] = useState(null)
  const [catMap, setCatMap] = useState({})
  const [boxMap, setBoxMap] = useState({})
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  // Forms
  const [showCreatePay, setShowCreatePay] = useState(false)
  const [showAddTxn, setShowAddTxn] = useState(false)
  const [payForm, setPayForm] = useState({ total_amount: '', paid_amount: '0', notes: '' })
  const [txnForm, setTxnForm] = useState({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [pRes, cRes, bRes] = await Promise.allSettled([
        purchaseAPI.get(id),
        categoryAPI.list(),
        boxTypeAPI.list(),
      ])
      setPurchase(pRes.value?.data)
      const cm = {}; (Array.isArray(cRes.value?.data) ? cRes.value.data : []).forEach(c => { cm[c.id] = c }); setCatMap(cm)
      const bm = {}; (Array.isArray(bRes.value?.data) ? bRes.value.data : []).forEach(b => { bm[b.id] = b }); setBoxMap(bm)

      // Load payment record if exists
      try {
        const payRes = await purchasePaymentAPI.getByPurchase(id)
        setPayment(payRes.data)
      } catch { setPayment(null) }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleCreatePayment = async (grandTotal) => {
    if (!payForm.total_amount) { toast.error('Total amount dalo'); return }
    setSaving(true)
    try {
      const pp = await purchasePaymentAPI.create({
        purchase_id: parseInt(id),
        total_amount: parseFloat(payForm.total_amount) || grandTotal,
        paid_amount: parseFloat(payForm.paid_amount) || 0,
        notes: payForm.notes || null,
      })
      setPayment(pp.data)
      setShowCreatePay(false)
      setPayForm({ total_amount: '', paid_amount: '0', notes: '' })
      toast.success('Payment record created!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleAddTxn = async () => {
    if (!txnForm.amount || !txnForm.paid_at) { toast.error('Amount aur date dalo'); return }
    setSaving(true)
    try {
      const pp = await purchasePaymentAPI.addTransaction(payment.id, {
        amount: parseFloat(txnForm.amount),
        notes: txnForm.notes || null,
        paid_at: txnForm.paid_at,
      })
      setPayment(pp.data)
      setShowAddTxn(false)
      setTxnForm({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) })
      toast.success('Payment added!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />
  if (!purchase) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">❌</p>
      <p className="text-gray-500">Purchase not found</p>
      <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
    </div>
  )

  const mangoItems = purchase.items?.filter(i => i.item_type === 'mango') || []
  const boxItems   = purchase.items?.filter(i => i.item_type === 'empty_box') || []
  const mangoTotal = mangoItems.reduce((s, i) => s + i.quantity * i.price_per_unit, 0)
  const boxTotal   = boxItems.reduce((s, i) => s + i.quantity * i.price_per_unit, 0)
  const grandTotal = mangoTotal + boxTotal

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg active:scale-95">
            ←
          </button>
          <div>
            <p className="text-primary-100 text-xs">Purchase Details</p>
            <h1 className="text-xl font-extrabold">Purchase #{purchase.id}</h1>
          </div>
        </div>
        <div className="mt-4 bg-white/15 rounded-2xl p-4">
          <p className="text-primary-100 text-xs uppercase font-semibold tracking-wide">Total Purchase Value</p>
          <p className="text-3xl font-extrabold mt-0.5">{fmtMoney(grandTotal)}</p>
          <p className="text-primary-100 text-xs mt-1">{purchase.items?.length || 0} items • {purchase.company_name}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Supplier */}
        <div className="card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Supplier Details</p>
          {[
            ['Company', purchase.company_name],
            ['City', purchase.city_name],
            ['Vehicle', purchase.vehicle_number],
            ['Unload Employee', purchase.unload_employee],
            ['Purchase Date', fmtDateTime(purchase.purchase_datetime)],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xs font-bold text-gray-800">{val}</p>
            </div>
          ))}
        </div>

        {/* Mango Items */}
        {mangoItems.length > 0 && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Mango Items</p>
            <div className="space-y-2">
              {mangoItems.map(item => {
                const cat = catMap[item.mango_category_id]
                return (
                  <div key={item.id} className="bg-primary-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {cat && <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">{cat.category_number}</span>}
                      <p className="font-semibold text-primary-800 text-sm">{cat?.name || 'Mango'}</p>
                      <span className="ml-auto text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">{item.size}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>{fmtNum(item.quantity)} boxes × {fmtMoney(item.price_per_unit)}</span>
                      <span className="font-bold text-primary-700">{fmtMoney(item.quantity * item.price_per_unit)}</span>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100">
                <p className="text-gray-600">Mango Total</p>
                <p className="text-primary-700">{fmtMoney(mangoTotal)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Box Items */}
        {boxItems.length > 0 && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Box Items</p>
            <div className="space-y-2">
              {boxItems.map(item => {
                const b = boxMap[item.box_type_id]
                return (
                  <div key={item.id} className="bg-mango-50 rounded-xl p-3">
                    <p className="font-semibold text-mango-700 text-sm">{b ? `${b.brand_name} • ${b.size} • ${b.box_weight}` : 'Box'}</p>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>{fmtNum(item.quantity)} pcs × {fmtMoney(item.price_per_unit)}</span>
                      <span className="font-bold text-mango-600">{fmtMoney(item.quantity * item.price_per_unit)}</span>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100">
                <p className="text-gray-600">Box Total</p>
                <p className="text-mango-600">{fmtMoney(boxTotal)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Grand Total */}
        <div className="card border-primary-100" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
          <div className="flex justify-between text-lg font-extrabold text-primary-700">
            <p>Grand Total</p>
            <p>{fmtMoney(grandTotal)}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1">Entry on {fmtDateTime(purchase.created_at)}</p>
        </div>

        {/* ── Payment Section ─────────────────────────────────────────────── */}
        <div className="card space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-bold text-gray-900">Supplier Payment</p>
            {payment && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${statusBadge[payment.status]}`}>
                {payment.status}
              </span>
            )}
          </div>

          {!payment ? (
            showCreatePay ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Grand Total is {fmtMoney(grandTotal)} — enter how much you owe</p>
                <input className="input-field" type="number"
                  placeholder={`Total to pay (e.g. ${fmtMoney(grandTotal)})`}
                  value={payForm.total_amount}
                  onChange={e => setPayForm(f => ({ ...f, total_amount: e.target.value }))} />
                <input className="input-field" type="number" placeholder="Already paid ₹ (0 if none)"
                  value={payForm.paid_amount}
                  onChange={e => setPayForm(f => ({ ...f, paid_amount: e.target.value }))} />
                <input className="input-field" placeholder="Notes (optional)"
                  value={payForm.notes}
                  onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="flex gap-2">
                  <button onClick={() => handleCreatePayment(grandTotal)} disabled={saving}
                    className="btn-primary flex-1 py-2.5 text-sm">{saving ? 'Saving...' : 'Create Record'}</button>
                  <button onClick={() => setShowCreatePay(false)}
                    className="flex-1 py-2.5 text-sm bg-gray-100 rounded-xl font-semibold text-gray-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowCreatePay(true); setPayForm({ total_amount: String(grandTotal), paid_amount: '0', notes: '' }) }}
                className="w-full py-3 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold border border-primary-200">
                + Track Payment to Supplier
              </button>
            )
          ) : (
            <div className="space-y-3">
              {/* Payment summary */}
              <div className="flex gap-2">
                {[
                  { label: 'Total', value: payment.total_amount, c: 'bg-gray-50 text-gray-700' },
                  { label: 'Paid', value: payment.paid_amount, c: 'bg-green-50 text-green-700' },
                  { label: 'Baki', value: payment.remaining_amount, c: payment.remaining_amount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700' },
                ].map(s => (
                  <div key={s.label} className={`flex-1 ${s.c} rounded-xl py-2 px-2 text-center`}>
                    <p className="text-sm font-bold">{fmtMoney(s.value)}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((payment.paid_amount / payment.total_amount) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-center">
                {((payment.paid_amount / payment.total_amount) * 100).toFixed(0)}% paid
              </p>

              {/* Transaction history */}
              {payment.transactions.length > 0 && (
                <div className="bg-green-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-bold text-green-800">Payment History</p>
                  {payment.transactions.map(t => (
                    <div key={t.id} className="flex justify-between text-xs text-green-700">
                      <span>{fmtDate(t.paid_at)}{t.notes ? ` — ${t.notes}` : ''}</span>
                      <span className="font-bold">{fmtMoney(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {payment.notes && (
                <p className="text-xs text-gray-400 italic">{payment.notes}</p>
              )}

              {/* Add more payment */}
              {payment.remaining_amount > 0 && (
                showAddTxn ? (
                  <div className="space-y-2">
                    <input className="input-field" type="number"
                      placeholder={`Amount (max ${fmtMoney(payment.remaining_amount)})`}
                      value={txnForm.amount}
                      onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
                    <input type="datetime-local" className="input-field"
                      value={txnForm.paid_at}
                      onChange={e => setTxnForm(f => ({ ...f, paid_at: e.target.value }))} />
                    <input className="input-field" placeholder="Notes (optional)"
                      value={txnForm.notes}
                      onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={handleAddTxn} disabled={saving}
                        className="btn-primary flex-1 py-2.5 text-sm">{saving ? 'Saving...' : 'Add Payment'}</button>
                      <button onClick={() => setShowAddTxn(false)}
                        className="flex-1 py-2.5 text-sm bg-gray-100 rounded-xl font-semibold text-gray-600">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setShowAddTxn(true); setTxnForm({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) }) }}
                    className="w-full py-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200">
                    + Pay {fmtMoney(payment.remaining_amount)} Remaining
                  </button>
                )
              )}

              {payment.remaining_amount <= 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-green-700 font-bold text-sm">✅ Fully Paid!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
