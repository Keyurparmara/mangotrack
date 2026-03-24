import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoryAPI, boxTypeAPI, salesAPI, stockAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { PageLoader } from '../../components/Spinner'
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

const initForm = {
  mango_category_id: '', size: '5kg', quantity: '',
  price_per_box: '', box_type_id: '', box_quantity: '', box_price_per_unit: '',
  customer_name: '', customer_village: '', customer_phone: '',
  transport_type: '', vehicle_number: '', city: '',
  dispatch_time: '', expected_delivery_time: '', due_date: '',
}

export default function CreateSale() {
  const { fmtMoney } = useLanguage()
  const [categories, setCategories] = useState([])
  const [boxTypes, setBoxTypes] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [boxStockMap, setBoxStockMap] = useState({})
  const [customers, setCustomers] = useState([]) // for autocomplete
  const [form, setForm] = useState(initForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    Promise.allSettled([categoryAPI.list(), boxTypeAPI.list(), stockAPI.getMango(), stockAPI.getBoxes(), salesAPI.getCustomers()])
      .then(([cRes, bRes, sRes, bsRes, custRes]) => {
        setCategories(Array.isArray(cRes.value?.data) ? cRes.value.data : [])
        setBoxTypes(Array.isArray(bRes.value?.data) ? bRes.value.data : [])
        const map = {}
        ;(Array.isArray(sRes.value?.data) ? sRes.value.data : []).forEach(s => {
          map[`${s.mango_category_id}_${s.size}`] = s.available
        })
        setStockMap(map)
        const bmap = {}
        ;(Array.isArray(bsRes.value?.data) ? bsRes.value.data : []).forEach(b => {
          bmap[b.box_type_id] = b.available
        })
        setBoxStockMap(bmap)
        setCustomers(Array.isArray(custRes.value?.data) ? custRes.value.data : [])
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const mangoTotal = (parseFloat(form.quantity) || 0) * (parseFloat(form.price_per_box) || 0)
  const boxTotal   = (parseFloat(form.box_quantity) || 0) * (parseFloat(form.box_price_per_unit) || 0)
  const total = mangoTotal + boxTotal

  // When customer name is selected from autocomplete, fill other fields
  const handleCustomerSelect = (name) => {
    const c = customers.find(x => x.customer_name === name)
    if (c) {
      set('customer_name', c.customer_name)
      if (c.customer_village && !form.customer_village) set('customer_village', c.customer_village)
      if (c.customer_phone && !form.customer_phone) set('customer_phone', c.customer_phone)
    }
  }

  const validate = () => {
    const hasMango = form.mango_category_id && form.quantity && form.price_per_box
    const hasBox   = form.box_type_id && form.box_quantity && form.box_price_per_unit
    if (!hasMango && !hasBox) {
      toast.error('Mango ya box mein se kuch to select karo'); return false
    }
    if (hasMango) {
      if (parseInt(form.quantity) <= 0) { toast.error('Mango quantity sahi dalo'); return false }
      if (parseFloat(form.price_per_box) <= 0) { toast.error('Mango price sahi dalo'); return false }
    }
    if (hasBox) {
      if (parseInt(form.box_quantity) <= 0) { toast.error('Box quantity sahi dalo'); return false }
      if (parseFloat(form.box_price_per_unit) <= 0) { toast.error('Box price sahi dalo'); return false }
    }
    if (!form.vehicle_number.trim()) { toast.error('Enter vehicle number'); return false }
    if (!form.city.trim()) { toast.error('Enter city name'); return false }
    if (!form.dispatch_time) { toast.error('Select dispatch time'); return false }
    if (!form.expected_delivery_time) { toast.error('Select delivery time'); return false }
    if (new Date(form.expected_delivery_time) <= new Date(form.dispatch_time)) {
      toast.error('Delivery must be after dispatch'); return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await salesAPI.create({
        mango_category_id: form.mango_category_id ? parseInt(form.mango_category_id) : null,
        size: form.size,
        quantity: form.quantity ? parseInt(form.quantity) : null,
        price_per_box: form.price_per_box ? parseFloat(form.price_per_box) : null,
        box_type_id: form.box_type_id ? parseInt(form.box_type_id) : null,
        box_quantity: form.box_quantity ? parseInt(form.box_quantity) : null,
        box_price_per_unit: form.box_price_per_unit ? parseFloat(form.box_price_per_unit) : null,
        customer_name: form.customer_name.trim() || null,
        customer_village: form.customer_village.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        transport_type: form.transport_type.trim() || null,
        vehicle_number: form.vehicle_number.trim(),
        city: form.city.trim(),
        dispatch_time: form.dispatch_time,
        expected_delivery_time: form.expected_delivery_time,
        due_date: form.due_date || null,
      })
      toast.success('Sale created! 🎉')
      setForm(initForm)
      navigate(user?.role === 'manager' ? '/all-sales' : '/my-sales')
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Failed to create sale')
    } finally { setSubmitting(false) }
  }

  const selectedCat = categories.find(c => c.id === parseInt(form.mango_category_id))
  const selectedBox = boxTypes.find(b => b.id === parseInt(form.box_type_id))

  const availableStock = form.mango_category_id && form.size
    ? (stockMap[`${form.mango_category_id}_${form.size}`] ?? null)
    : null
  const enteredQty = parseInt(form.quantity) || 0
  const stockOk = availableStock === null || enteredQty <= availableStock

  const availableBoxStock = form.box_type_id
    ? (boxStockMap[parseInt(form.box_type_id)] ?? null)
    : null
  const enteredBoxQty = parseInt(form.box_quantity) || 0
  const boxStockOk = availableBoxStock === null || enteredBoxQty <= availableBoxStock

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm capitalize">{user?.role || 'Employee'}</p>
        <h1 className="text-2xl font-extrabold">New Sale 🥭</h1>
        <p className="text-primary-100 text-xs mt-1">Stock will be deducted automatically</p>
      </div>

      {/* Total Preview Bar */}
      {total > 0 && (
        <div className="mx-4 mt-4 bg-primary-600 text-white rounded-2xl p-4 shadow-lg">
          <p className="text-xs text-primary-100 mb-1">Order Total</p>
          <p className="text-2xl font-extrabold">{fmtMoney(total)}</p>
          <div className="flex gap-3 mt-2 flex-wrap">
            {mangoTotal > 0 && <p className="text-xs text-primary-100">🥭 {form.quantity} boxes × {fmtMoney(form.price_per_box)} = {fmtMoney(mangoTotal)}</p>}
            {boxTotal > 0 && <p className="text-xs text-primary-100">📦 {form.box_quantity} pcs × {fmtMoney(form.box_price_per_unit)} = {fmtMoney(boxTotal)}</p>}
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">

        {/* Mango Details */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">🥭 Mango Details</p>

          <div>
            <label className="label">Category</label>
            <select className="select-field" value={form.mango_category_id} onChange={e => set('mango_category_id', e.target.value)}>
              <option value="">Select mango category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — Grade {c.category_number} {c.description ? `(${c.description})` : ''}
                </option>
              ))}
            </select>
            {selectedCat && (
              <div className="mt-2 flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-2">
                <span className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">{selectedCat.category_number}</span>
                <div>
                  <p className="text-xs font-semibold text-primary-800">{selectedCat.name}</p>
                  {selectedCat.description && <p className="text-[10px] text-primary-600">{selectedCat.description}</p>}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Box Size</label>
            <div className="grid grid-cols-2 gap-2">
              {['5kg', '10kg'].map(s => (
                <button key={s} type="button" onClick={() => set('size', s)}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ` +
                    (form.size === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity (boxes)</label>
              <input
                className={`input-field ${!stockOk ? 'border-red-400 bg-red-50' : ''}`}
                type="number" placeholder="0"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Price / box ₹</label>
              <input className="input-field" type="number" placeholder="0.00" value={form.price_per_box} onChange={e => set('price_per_box', e.target.value)} />
            </div>
          </div>

          {/* Stock indicator */}
          {availableStock !== null && (
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
              availableStock === 0
                ? 'bg-red-50 text-red-600 border border-red-200'
                : !stockOk
                ? 'bg-red-50 text-red-600 border border-red-200'
                : enteredQty > 0 && availableStock - enteredQty < 10
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <span>{availableStock === 0 ? '❌' : !stockOk ? '❌' : enteredQty > 0 && availableStock - enteredQty < 10 ? '⚠️' : '✅'}</span>
              <span>
                {availableStock === 0
                  ? 'Is category ka stock khatam — sale nahi ho sakti'
                  : !stockOk
                  ? `Stock nahi hai! Sirf ${availableStock} boxes hain`
                  : enteredQty > 0
                  ? `Stock: ${availableStock} boxes (${availableStock - enteredQty} bachenge)`
                  : `Stock available: ${availableStock} boxes`
                }
              </span>
            </div>
          )}
        </div>

        {/* Box Sale */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">📦 Box Sale (Optional)</p>
            {form.box_type_id && (
              <button type="button" onClick={() => { set('box_type_id', ''); set('box_quantity', ''); set('box_price_per_unit', '') }}
                className="text-xs text-red-400 font-semibold">Clear</button>
            )}
          </div>
          <p className="text-xs text-gray-400">Agar customer ko empty boxes bhi bechne hain to fill karo</p>
          <div>
            <label className="label">Box Brand (Konsa Box)</label>
            <select className="select-field" value={form.box_type_id} onChange={e => set('box_type_id', e.target.value)}>
              <option value="">Select box type</option>
              {boxTypes.map(b => (
                <option key={b.id} value={b.id}>
                  {b.brand_name} • {b.size} • {b.box_weight}
                </option>
              ))}
            </select>
            {selectedBox && (
              <div className="mt-2 flex items-center gap-2 bg-mango-50 rounded-xl px-3 py-2">
                <span className="text-lg">📦</span>
                <p className="text-xs font-semibold text-mango-700">{selectedBox.brand_name} — {selectedBox.size} / {selectedBox.box_weight}</p>
              </div>
            )}
          </div>
          {form.box_type_id && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity (pcs)</label>
                  <input
                    className={`input-field ${!boxStockOk ? 'border-red-400 bg-red-50' : ''}`}
                    type="number" placeholder="0"
                    value={form.box_quantity}
                    onChange={e => set('box_quantity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Price / box ₹</label>
                  <input className="input-field" type="number" placeholder="0.00" value={form.box_price_per_unit} onChange={e => set('box_price_per_unit', e.target.value)} />
                </div>
              </div>
              {availableBoxStock !== null && (
                <div className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                  availableBoxStock === 0
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : !boxStockOk
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : enteredBoxQty > 0 && availableBoxStock - enteredBoxQty < 20
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <span>{availableBoxStock === 0 ? '❌' : !boxStockOk ? '❌' : enteredBoxQty > 0 && availableBoxStock - enteredBoxQty < 20 ? '⚠️' : '✅'}</span>
                  <span>
                    {availableBoxStock === 0
                      ? 'Box stock khatam!'
                      : !boxStockOk
                      ? `Box stock nahi! Sirf ${availableBoxStock} pcs hain`
                      : enteredBoxQty > 0
                      ? `Box stock: ${availableBoxStock} pcs (${availableBoxStock - enteredBoxQty} bachenge)`
                      : `Box stock: ${availableBoxStock} pcs`
                    }
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Customer Details */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">👤 Customer Details</p>
          <div>
            <label className="label">Customer Name (Kisko Becha)</label>
            <input
              className="input-field" placeholder="e.g. Ramesh Patel"
              value={form.customer_name}
              list="customer-names-list"
              onChange={e => {
                set('customer_name', e.target.value)
                handleCustomerSelect(e.target.value)
              }}
            />
            {customers.length > 0 && (
              <datalist id="customer-names-list">
                {customers.map((c, i) => (
                  <option key={i} value={c.customer_name}>
                    {c.customer_village ? `${c.customer_name} (${c.customer_village})` : c.customer_name}
                  </option>
                ))}
              </datalist>
            )}
          </div>
          <div>
            <label className="label">Customer Village / City (Kahan Ka)</label>
            <input className="input-field" placeholder="e.g. Navsari, Surat" value={form.customer_village}
              onChange={e => set('customer_village', e.target.value)} />
          </div>
          <div>
            <label className="label">Customer Phone (Optional)</label>
            <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.customer_phone}
              onChange={e => set('customer_phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Bhejne Ka Tarika (Kese Bheja)</label>
            <div className="grid grid-cols-3 gap-2">
              {['Truck', 'Auto', 'Hand Delivery', 'Train', 'Bus', 'Other'].map(t => (
                <button key={t} type="button" onClick={() => set('transport_type', t)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ` +
                    (form.transport_type === t
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200')}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">🚚 Delivery Details</p>
          <div>
            <label className="label">Vehicle Number (e.g. GJ/32/AH/5940)</label>
            <input
              className="input-field font-mono tracking-wider"
              placeholder="GJ/32/AH/5940"
              value={form.vehicle_number}
              onChange={e => set('vehicle_number', formatVehicle(e.target.value))}
              maxLength={13}
            />
          </div>
          <div>
            <label className="label">Destination City</label>
            <input className="input-field" placeholder="e.g. Mumbai" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <label className="label">Dispatch Time</label>
            <input type="datetime-local" className="input-field" value={form.dispatch_time} onChange={e => set('dispatch_time', e.target.value)} />
          </div>
          <div>
            <label className="label">Expected Delivery</label>
            <input type="datetime-local" className="input-field" value={form.expected_delivery_time} onChange={e => set('expected_delivery_time', e.target.value)} />
          </div>
        </div>

        {/* Payment Due Date */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">💰 Payment Due Date (Optional)</p>
          <p className="text-xs text-gray-400">Agar customer ne abhi payment nahi ki, to due date dalo — auto reminder ban jayega</p>
          <div>
            <label className="label">Payment Due Date</label>
            <input type="datetime-local" className="input-field" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          {form.due_date && (
            <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold">
              ⏰ 1 din pehle reminder automatic ban jayega: {new Date(new Date(form.due_date) - 86400000).toLocaleDateString('en-IN')}
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-lg py-4">
          {submitting ? 'Creating Sale...' : '✅ Confirm Sale'}
        </button>
      </div>
    </div>
  )
}
