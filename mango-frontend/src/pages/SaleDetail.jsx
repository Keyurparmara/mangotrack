import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { salesAPI, categoryAPI, boxTypeAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/Spinner'
import { useLanguage } from '../context/LanguageContext'

export default function SaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fmtMoney, fmtNum, fmtDate, fmtDateTime } = useLanguage()
  const [sale, setSale] = useState(null)
  const [cat, setCat] = useState(null)
  const [box, setBox] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes, bRes] = await Promise.allSettled([
          salesAPI.get(id),
          categoryAPI.list(),
          boxTypeAPI.list(),
        ])
        const s = sRes.value?.data
        if (!s) { setError('Sale not found'); return }
        setSale(s)
        const cats = cRes.value?.data || []
        const boxes = bRes.value?.data || []
        if (s.mango_category_id) setCat(cats.find(c => c.id === s.mango_category_id))
        if (s.box_type_id) setBox(boxes.find(b => b.id === s.box_type_id))
      } catch { setError('Could not load sale') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return <PageLoader />
  if (error) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">❌</p>
      <p className="text-gray-500">{error}</p>
      <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
    </div>
  )

  const isMe = String(sale.employee_id) === String(user?.id)
  const mangoTotal = (sale.quantity || 0) * (sale.price_per_box || 0)
  const boxTotal   = (sale.box_quantity || 0) * (sale.box_price_per_unit || 0)

  const fmt = (dt) => fmtDateTime(dt)

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg active:scale-95">
            ←
          </button>
          <div>
            <p className="text-primary-100 text-xs">Sale Details</p>
            <h1 className="text-xl font-extrabold">Order #{sale.id}</h1>
          </div>
        </div>

        {/* Total */}
        <div className="mt-4 bg-white/15 rounded-2xl p-4">
          <p className="text-primary-100 text-xs uppercase font-semibold tracking-wide">Total Amount</p>
          <p className="text-3xl font-extrabold mt-0.5">{fmtMoney(sale.total_amount)}</p>
          <p className="text-primary-100 text-xs mt-1">
            {fmtDate(sale.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Who made this sale */}
        <div className="card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Kisne Kiya</p>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-bold ${isMe ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
              {isMe ? '👤' : '🧑‍💼'}
            </div>
            <div>
              <p className="font-bold text-gray-900">
                {isMe ? `Aapne kiya (${sale.employee_username || user?.username})` : `${sale.employee_username || 'Employee'} ne kiya`}
              </p>
              <p className="text-xs text-gray-400">Employee ID: {sale.employee_id}</p>
            </div>
            {isMe && <span className="ml-auto text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-bold">You</span>}
          </div>
        </div>

        {/* Customer Details */}
        {(sale.customer_name || sale.customer_village || sale.transport_type) && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Customer Details</p>
            <div className="space-y-2">
              {sale.customer_name && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧑</span>
                  <div>
                    <p className="text-xs text-gray-400">Kisko Becha</p>
                    <p className="font-semibold text-gray-900">{sale.customer_name}</p>
                  </div>
                </div>
              )}
              {sale.customer_village && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <p className="text-xs text-gray-400">Kahan Ka</p>
                    <p className="font-semibold text-gray-900">{sale.customer_village}</p>
                  </div>
                </div>
              )}
              {sale.transport_type && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚛</span>
                  <div>
                    <p className="text-xs text-gray-400">Kese Bheja</p>
                    <p className="font-semibold text-gray-900">{sale.transport_type}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mango Details */}
        {sale.mango_category_id && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">🥭 Mango Sale</p>
            <div className="space-y-2">
              {cat && (
                <div className="bg-primary-50 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">{cat.category_number}</span>
                  <div>
                    <p className="text-sm font-bold text-primary-800">{cat.name}</p>
                    {cat.description && <p className="text-xs text-primary-600">{cat.description}</p>}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Size</p>
                  <p className="text-sm font-bold text-gray-800">{sale.size}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Qty</p>
                  <p className="text-sm font-bold text-gray-800">{sale.quantity} boxes</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Price/box</p>
                  <p className="text-sm font-bold text-gray-800">₹{sale.price_per_box}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-xs text-gray-500">{sale.quantity} × ₹{sale.price_per_box}</p>
                <p className="font-extrabold text-primary-700">{fmtMoney(mangoTotal)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Box Details */}
        {sale.box_type_id && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📦 Box Sale</p>
            {box && (
              <div className="bg-mango-50 rounded-xl px-3 py-2 mb-2">
                <p className="text-sm font-bold text-mango-700">{box.brand_name}</p>
                <p className="text-xs text-mango-600">{box.size} • {box.box_weight}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Quantity</p>
                <p className="text-sm font-bold text-gray-800">{sale.box_quantity} pcs</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Price/pc</p>
                <p className="text-sm font-bold text-gray-800">₹{sale.box_price_per_unit}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-gray-500">{sale.box_quantity} × ₹{sale.box_price_per_unit}</p>
              <p className="font-extrabold text-mango-600">{fmtMoney(boxTotal)}</p>
            </div>
          </div>
        )}

        {/* Delivery Details */}
        <div className="card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">🚚 Delivery Details</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-xs text-gray-500">Vehicle</p>
              <p className="text-xs font-bold text-gray-800">{sale.vehicle_number}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs text-gray-500">Destination</p>
              <p className="text-xs font-bold text-gray-800">{sale.city}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs text-gray-500">Dispatch</p>
              <p className="text-xs font-bold text-gray-800">{fmt(sale.dispatch_time)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs text-gray-500">Expected Delivery</p>
              <p className="text-xs font-bold text-gray-800">{fmt(sale.expected_delivery_time)}</p>
            </div>
          </div>
        </div>

        {/* Total Breakdown */}
        <div className="card bg-primary-50 border border-primary-100">
          <p className="text-xs font-bold text-primary-400 uppercase tracking-wide mb-2">Total Breakdown</p>
          {mangoTotal > 0 && (
            <div className="flex justify-between text-sm">
              <p className="text-gray-600">🥭 Mango ({fmtNum(sale.quantity)} × {fmtMoney(sale.price_per_box)})</p>
              <p className="font-bold">{fmtMoney(mangoTotal)}</p>
            </div>
          )}
          {boxTotal > 0 && (
            <div className="flex justify-between text-sm">
              <p className="text-gray-600">📦 Box ({fmtNum(sale.box_quantity)} × {fmtMoney(sale.box_price_per_unit)})</p>
              <p className="font-bold">{fmtMoney(boxTotal)}</p>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-primary-700 border-t border-primary-200 mt-2 pt-2">
            <p>Grand Total</p>
            <p>{fmtMoney(sale.total_amount)}</p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Timeline</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <p className="text-gray-400">Entry Created</p>
              <p className="text-gray-700 font-medium">{fmt(sale.created_at)}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
