import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoryAPI, boxTypeAPI, purchaseAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { useLanguage } from '../../context/LanguageContext'

const emptyPurchase = {
  city_name: '', company_name: '', vehicle_number: '',
  unload_employee: '', purchase_datetime: '',
}
const emptyMango = { mango_category_id: '', size: '5kg', quantity: '', price_per_unit: '' }
const emptyBox = { box_type_id: '', quantity: '', price_per_unit: '' }

export default function Purchases() {
  const { user } = useAuth()
  const { fmtDate } = useLanguage()
  const navigate = useNavigate()
  const [step, setStep] = useState('list') // list | create
  const [purchases, setPurchases] = useState([])
  const [categories, setCategories] = useState([])
  const [boxTypes, setBoxTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState(emptyPurchase)
  const [mangoItems, setMangoItems] = useState([{ ...emptyMango }])
  const [boxItems, setBoxItems] = useState([])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, cRes, bRes] = await Promise.allSettled([
        purchaseAPI.list(), categoryAPI.list(), boxTypeAPI.list()
      ])
      setPurchases(Array.isArray(pRes.value?.data) ? pRes.value.data : [])
      setCategories(Array.isArray(cRes.value?.data) ? cRes.value.data : [])
      setBoxTypes(Array.isArray(bRes.value?.data) ? bRes.value.data : [])
    } finally {
      setLoading(false)
    }
  }

  const addMangoRow = () => setMangoItems([...mangoItems, { ...emptyMango }])
  const addBoxRow = () => setBoxItems([...boxItems, { ...emptyBox }])
  const removeMangoRow = (i) => setMangoItems(mangoItems.filter((_, idx) => idx !== i))
  const removeBoxRow = (i) => setBoxItems(boxItems.filter((_, idx) => idx !== i))

  const updateMango = (i, k, v) => {
    const arr = [...mangoItems]; arr[i] = { ...arr[i], [k]: v }; setMangoItems(arr)
  }
  const updateBox = (i, k, v) => {
    const arr = [...boxItems]; arr[i] = { ...arr[i], [k]: v }; setBoxItems(arr)
  }

  const handleSubmit = async () => {
    if (!form.city_name || !form.company_name || !form.vehicle_number || !form.unload_employee || !form.purchase_datetime) {
      toast.error('Fill all purchase details'); return
    }
    if (mangoItems.length === 0 && boxItems.length === 0) {
      toast.error('Add at least one item'); return
    }

    const items = [
      ...mangoItems.filter(m => m.mango_category_id && m.quantity && m.price_per_unit).map(m => ({
        item_type: 'mango',
        mango_category_id: parseInt(m.mango_category_id),
        size: m.size,
        quantity: parseInt(m.quantity),
        price_per_unit: parseFloat(m.price_per_unit),
      })),
      ...boxItems.filter(b => b.box_type_id && b.quantity && b.price_per_unit).map(b => ({
        item_type: 'empty_box',
        box_type_id: parseInt(b.box_type_id),
        quantity: parseInt(b.quantity),
        price_per_unit: parseFloat(b.price_per_unit),
      })),
    ]

    if (items.length === 0) { toast.error('Fill item details completely'); return }

    setSubmitting(true)
    try {
      await purchaseAPI.create({ ...form, items })
      toast.success('Purchase created! 🎉')
      setForm(emptyPurchase); setMangoItems([{ ...emptyMango }]); setBoxItems([])
      setStep('list')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create purchase')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
            <h1 className="text-2xl font-extrabold">Purchases 🛒</h1>
          </div>
          <button onClick={() => setStep(step === 'list' ? 'create' : 'list')}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all">
            {step === 'list' ? '+ New' : '← Back'}
          </button>
        </div>
      </div>

      {step === 'list' ? (
        <div className="px-4 py-4 space-y-3">
          {purchases.length === 0 ? (
            <EmptyState icon="🛒" title="No purchases yet" subtitle="Tap + New to record a purchase" />
          ) : (
            purchases.slice().reverse().map(p => (
              <div key={p.id} className="card active:scale-[0.98] transition-all cursor-pointer"
                onClick={() => navigate(`/purchases/${p.id}`)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{p.company_name}</p>
                    <p className="text-xs text-gray-500">{p.city_name} • {p.vehicle_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(p.purchase_datetime)}</p>
                  </div>
                  <span className="text-xs font-bold bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                    {p.items?.length || 0} items
                  </span>
                </div>
                {p.items?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                    {p.items.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600">
                        <span className="capitalize">{item.item_type === 'mango' ? `🥭 Mango ${item.size}` : `📦 Box`}</span>
                        <span className="font-semibold">{item.quantity} × ₹{item.price_per_unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Purchase Details */}
          <div className="card space-y-3">
            <p className="font-bold text-gray-900 flex items-center gap-2">📋 Purchase Details</p>
            <div><label className="label">City</label><input className="input-field" placeholder="e.g. Surat" value={form.city_name} onChange={e => setForm({ ...form, city_name: e.target.value })} /></div>
            <div><label className="label">Company Name</label><input className="input-field" placeholder="e.g. Patel Traders" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><label className="label">Vehicle Number</label><input className="input-field" placeholder="e.g. GJ05AB1234" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} /></div>
            <div><label className="label">Unload Employee</label><input className="input-field" placeholder="Employee name" value={form.unload_employee} onChange={e => setForm({ ...form, unload_employee: e.target.value })} /></div>
            <div><label className="label">Date & Time</label><input type="datetime-local" className="input-field" value={form.purchase_datetime} onChange={e => setForm({ ...form, purchase_datetime: e.target.value })} /></div>
          </div>

          {/* Mango Items */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">🥭 Mango Items</p>
              <button onClick={addMangoRow} className="btn-sm">+ Add</button>
            </div>
            {mangoItems.map((item, i) => (
              <div key={i} className="bg-primary-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-primary-700">Item {i + 1}</span>
                  {mangoItems.length > 1 && (
                    <button onClick={() => removeMangoRow(i)} className="text-red-400 text-xs font-semibold">Remove</button>
                  )}
                </div>
                <select className="select-field" value={item.mango_category_id} onChange={e => updateMango(i, 'mango_category_id', e.target.value)}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name} (Grade {c.category_number})</option>)}
                </select>
                <select className="select-field" value={item.size} onChange={e => updateMango(i, 'size', e.target.value)}>
                  <option value="5kg">5 kg</option>
                  <option value="10kg">10 kg</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field" type="number" placeholder="Qty (boxes)" value={item.quantity} onChange={e => updateMango(i, 'quantity', e.target.value)} />
                  <input className="input-field" type="number" placeholder="Price/box ₹" value={item.price_per_unit} onChange={e => updateMango(i, 'price_per_unit', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {/* Box Items */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">📦 Empty Box Items</p>
              <button onClick={addBoxRow} className="btn-sm">+ Add</button>
            </div>
            {boxItems.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No box items added</p>}
            {boxItems.map((item, i) => (
              <div key={i} className="bg-mango-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-mango-500">Box {i + 1}</span>
                  <button onClick={() => removeBoxRow(i)} className="text-red-400 text-xs font-semibold">Remove</button>
                </div>
                <select className="select-field" value={item.box_type_id} onChange={e => updateBox(i, 'box_type_id', e.target.value)}>
                  <option value="">Select Box Type</option>
                  {boxTypes.map(b => <option key={b.id} value={b.id}>{b.brand_name} • {b.size} • {b.box_weight}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field" type="number" placeholder="Quantity" value={item.quantity} onChange={e => updateBox(i, 'quantity', e.target.value)} />
                  <input className="input-field" type="number" placeholder="Price ₹" value={item.price_per_unit} onChange={e => updateBox(i, 'price_per_unit', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : '✅ Create Purchase'}
          </button>
        </div>
      )}
    </div>
  )
}
