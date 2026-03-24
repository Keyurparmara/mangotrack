import { useEffect, useState } from 'react'
import { truckPaymentAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

// Auto-format vehicle number: GJ/32/AH/5940
function formatVehicle(input) {
  const v = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  let result = ''
  for (let i = 0; i < Math.min(v.length, 10); i++) {
    if (i === 2 || i === 4 || i === 6) result += '/'
    result += v[i]
  }
  return result
}

const statusBadge = {
  pending: 'bg-red-50 text-red-600 border-red-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
}

const emptyForm = {
  vehicle_number: '', driver_name: '', driver_phone: '', destination: '',
  boxes_count: '', total_freight: '', paid_amount: '0',
  departure_time: '', arrival_time: '', notes: ''
}

export default function TruckPayments() {
  const { user } = useAuth()
  const { fmtMoney, fmtDate } = useLanguage()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('list')
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [addTxnFor, setAddTxnFor] = useState(null)
  const [txnForm, setTxnForm] = useState({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) })
  const [txnSaving, setTxnSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = () => {
    setLoading(true)
    truckPaymentAPI.list()
      .then(r => setPayments(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load truck payments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.vehicle_number || !form.destination || !form.total_freight) {
      toast.error('Vehicle, destination aur freight amount dalo'); return
    }
    setSubmitting(true)
    try {
      await truckPaymentAPI.create({
        vehicle_number: form.vehicle_number.trim(),
        driver_name: form.driver_name.trim() || null,
        driver_phone: form.driver_phone.trim() || null,
        destination: form.destination.trim(),
        boxes_count: form.boxes_count ? parseInt(form.boxes_count) : null,
        total_freight: parseFloat(form.total_freight),
        paid_amount: parseFloat(form.paid_amount) || 0,
        departure_time: form.departure_time || null,
        arrival_time: form.arrival_time || null,
        notes: form.notes.trim() || null,
      })
      toast.success('Truck payment record created!')
      setForm(emptyForm)
      setStep('list')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSubmitting(false) }
  }

  const handleAddTxn = async (tp) => {
    if (!txnForm.amount || !txnForm.paid_at) { toast.error('Amount aur date dalo'); return }
    setTxnSaving(true)
    try {
      await truckPaymentAPI.addTransaction(tp.id, {
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
    } finally { setTxnSaving(false) }
  }

  const totalFreight = payments.reduce((s, p) => s + p.total_freight, 0)
  const totalPaid = payments.reduce((s, p) => s + p.paid_amount, 0)
  const totalBaki = payments.reduce((s, p) => s + p.remaining_amount, 0)

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
            <h1 className="text-2xl font-extrabold">Truck Payments</h1>
            <p className="text-primary-100 text-xs mt-1">Driver ko diye pese ka hisab</p>
          </div>
          <button onClick={() => setStep(step === 'list' ? 'create' : 'list')}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all">
            {step === 'list' ? '+ New' : '← Back'}
          </button>
        </div>
        {step === 'list' && totalFreight > 0 && (
          <div className="flex gap-3 mt-3 flex-wrap">
            <div className="bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-primary-100">Total Freight</p>
              <p className="text-base font-extrabold">{fmtMoney(totalFreight)}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-primary-100">Paid</p>
              <p className="text-base font-extrabold text-green-300">{fmtMoney(totalPaid)}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-primary-100">Baki</p>
              <p className="text-base font-extrabold text-red-300">{fmtMoney(totalBaki)}</p>
            </div>
          </div>
        )}
      </div>

      {step === 'create' && (
        <div className="px-4 py-4 space-y-4">
          <div className="card space-y-3">
            <p className="font-bold text-gray-900">Truck Details</p>
            <div>
              <label className="label">Vehicle Number (e.g. GJ/32/AH/5940)</label>
              <input className="input-field font-mono tracking-wider" placeholder="GJ/32/AH/5940"
                value={form.vehicle_number}
                onChange={e => set('vehicle_number', formatVehicle(e.target.value))}
                maxLength={13} />
            </div>
            <div>
              <label className="label">Driver Name (Optional)</label>
              <input className="input-field" placeholder="e.g. Ramesh Bhai" value={form.driver_name} onChange={e => set('driver_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Driver Phone (Optional)</label>
              <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.driver_phone} onChange={e => set('driver_phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Destination</label>
              <input className="input-field" placeholder="e.g. Mumbai" value={form.destination} onChange={e => set('destination', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Boxes Count</label>
                <input className="input-field" type="number" placeholder="0" value={form.boxes_count} onChange={e => set('boxes_count', e.target.value)} />
              </div>
              <div>
                <label className="label">Total Freight ₹</label>
                <input className="input-field" type="number" placeholder="0" value={form.total_freight} onChange={e => set('total_freight', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Advance Paid ₹ (if any)</label>
              <input className="input-field" type="number" placeholder="0" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Departure Time</label>
                <input type="datetime-local" className="input-field" value={form.departure_time} onChange={e => set('departure_time', e.target.value)} />
              </div>
              <div>
                <label className="label">Arrival Time</label>
                <input type="datetime-local" className="input-field" value={form.arrival_time} onChange={e => set('arrival_time', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Notes (Optional)</label>
              <input className="input-field" placeholder="Any notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <button onClick={handleCreate} disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Save Truck Payment'}
            </button>
          </div>
        </div>
      )}

      {step === 'list' && (
        <div className="px-4 py-4 space-y-3">
          {payments.length === 0 ? (
            <EmptyState icon="🚚" title="No truck payments yet" subtitle="Tap + New to record a truck payment" />
          ) : (
            payments.map(tp => (
              <div key={tp.id} className="card space-y-3">
                <div className="flex justify-between items-start cursor-pointer"
                  onClick={() => setExpanded(expanded === tp.id ? null : tp.id)}>
                  <div>
                    <p className="font-bold text-gray-900 font-mono">{tp.vehicle_number}</p>
                    <p className="text-xs text-gray-500">
                      {tp.destination}{tp.driver_name ? ` • ${tp.driver_name}` : ''}
                    </p>
                    {tp.driver_phone && (
                      <a href={`tel:${tp.driver_phone}`} className="text-xs text-blue-500 font-semibold"
                        onClick={e => e.stopPropagation()}>
                        📞 {tp.driver_phone}
                      </a>
                    )}
                    {tp.boxes_count && <p className="text-xs text-gray-400">{tp.boxes_count} boxes</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(tp.departure_time, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border capitalize ${statusBadge[tp.status]}`}>
                      {tp.status}
                    </span>
                    <p className="text-sm font-extrabold text-gray-900 mt-1">{fmtMoney(tp.total_freight)}</p>
                  </div>
                </div>

                {expanded === tp.id && (
                  <div className="space-y-3 pt-2 border-t border-gray-50">
                    <div className="flex gap-2">
                      {[
                        { label: 'Freight', value: tp.total_freight, c: 'bg-gray-50 text-gray-700' },
                        { label: 'Paid', value: tp.paid_amount, c: 'bg-green-50 text-green-700' },
                        { label: 'Baki', value: tp.remaining_amount, c: tp.remaining_amount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700' },
                      ].map(s => (
                        <div key={s.label} className={`flex-1 ${s.c} rounded-xl py-2 px-2 text-center`}>
                          <p className="text-xs font-bold">{fmtMoney(s.value)}</p>
                          <p className="text-[10px]">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {tp.arrival_time && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Arrived: {fmtDate(tp.arrival_time)}</span>
                      </div>
                    )}

                    {tp.notes && <p className="text-xs text-gray-500 italic">{tp.notes}</p>}

                    {/* Transaction history */}
                    {(tp.transactions?.length > 0) && (
                      <div className="bg-green-50 rounded-xl p-2 space-y-1">
                        <p className="text-xs font-bold text-green-800 mb-1">Payment History</p>
                        {(tp.transactions || []).map(t => (
                          <div key={t.id} className="flex justify-between text-xs text-green-700">
                            <span>{fmtDate(t.paid_at)}{t.notes ? ` — ${t.notes}` : ''}</span>
                            <span className="font-bold">{fmtMoney(t.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add payment */}
                    {tp.remaining_amount > 0 && (
                      addTxnFor === tp.id ? (
                        <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-bold text-amber-700">Pay Driver</p>
                          <input className="input-field" type="number"
                            placeholder={`Amount (max ${fmtMoney(tp.remaining_amount)})`}
                            value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
                          <input type="datetime-local" className="input-field"
                            value={txnForm.paid_at} onChange={e => setTxnForm(f => ({ ...f, paid_at: e.target.value }))} />
                          <input className="input-field" placeholder="Notes (optional)"
                            value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
                          <div className="flex gap-2">
                            <button onClick={() => handleAddTxn(tp)} disabled={txnSaving} className="btn-primary flex-1 py-2 text-sm">
                              {txnSaving ? 'Saving...' : 'Pay'}
                            </button>
                            <button onClick={() => setAddTxnFor(null)} className="flex-1 py-2 text-sm bg-gray-100 rounded-xl font-semibold">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setAddTxnFor(tp.id); setTxnForm({ amount: '', notes: '', paid_at: new Date().toISOString().slice(0, 16) }) }}
                          className="w-full py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200">
                          + Pay {fmtMoney(tp.remaining_amount)} Remaining
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
