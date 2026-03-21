import { useEffect, useState } from 'react'
import { stockAPI, categoryAPI, boxTypeAPI } from '../../api/api'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

export default function Stock() {
  const [stock, setStock] = useState({ mango: [], empty_boxes: [] })
  const [categories, setCategories] = useState([])
  const [boxTypes, setBoxTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mango')
  const [showAddCat, setShowAddCat] = useState(false)
  const [showAddBox, setShowAddBox] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', category_number: '', description: '' })
  const [boxForm, setBoxForm] = useState({ brand_name: '', size: '5kg', box_weight: '400g' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, cRes, bRes] = await Promise.allSettled([stockAPI.get(), categoryAPI.list(), boxTypeAPI.list()])
      setStock(sRes.value?.data || { mango: [], empty_boxes: [] })
      setCategories(cRes.value?.data || [])
      setBoxTypes(bRes.value?.data || [])
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    if (!catForm.name || !catForm.category_number) { toast.error('Fill name and grade'); return }
    setSaving(true)
    try {
      await categoryAPI.create({ ...catForm, category_number: parseInt(catForm.category_number) })
      toast.success('Category added!')
      setCatForm({ name: '', category_number: '', description: '' })
      setShowAddCat(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const addBoxType = async () => {
    if (!boxForm.brand_name) { toast.error('Enter brand name'); return }
    setSaving(true)
    try {
      await boxTypeAPI.create(boxForm)
      toast.success('Box type added!')
      setBoxForm({ brand_name: '', size: '5kg', box_weight: '400g' })
      setShowAddBox(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm">Manager</p>
        <h1 className="text-2xl font-extrabold">Stock 📦</h1>
        <p className="text-primary-100 text-xs mt-1">Live inventory — purchase minus sales</p>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 gap-2">
        {['mango', 'boxes', 'manage'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ` +
              (tab === t ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-500')}>
            {t === 'mango' ? '🥭 Mango' : t === 'boxes' ? '📦 Boxes' : '⚙️ Manage'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'mango' && (
          <>
            {stock.mango.length === 0 ? (
              <EmptyState icon="🥭" title="No mango stock" subtitle="Create a purchase to see stock" />
            ) : (
              stock.mango.map((item, i) => (
                <div key={i} className="card">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{item.mango_category_name}</p>
                      <p className="text-xs text-gray-500">Grade {item.category_number} • {item.size}</p>
                    </div>
                    <span className={`text-lg font-extrabold ${item.available > 0 ? 'text-primary-600' : 'text-red-400'}`}>
                      {item.available}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: 'Purchased', value: item.purchased, color: 'bg-blue-50 text-blue-700' },
                      { label: 'Sold', value: item.sold, color: 'bg-red-50 text-red-600' },
                      { label: 'Available', value: item.available, color: 'bg-primary-50 text-primary-700' },
                    ].map(s => (
                      <div key={s.label} className={`flex-1 ${s.color} rounded-xl py-2 px-2 text-center`}>
                        <p className="text-xs font-semibold">{s.value}</p>
                        <p className="text-[10px]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${item.purchased > 0 ? (item.available / item.purchased) * 100 : 0}%` }} />
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'boxes' && (
          <>
            {stock.empty_boxes.length === 0 ? (
              <EmptyState icon="📦" title="No box stock" subtitle="Create a purchase to see box stock" />
            ) : (
              stock.empty_boxes.map((item, i) => (
                <div key={i} className="card flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{item.brand_name}</p>
                    <p className="text-xs text-gray-500">{item.size} • {item.box_weight}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-primary-600">{item.available}</p>
                    <p className="text-xs text-gray-400">boxes</p>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'manage' && (
          <>
            {/* Mango Categories */}
            <div className="card space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900">🥭 Mango Categories</p>
                <button onClick={() => setShowAddCat(!showAddCat)} className="btn-sm">+ Add</button>
              </div>
              {showAddCat && (
                <div className="bg-primary-50 rounded-xl p-3 space-y-2">
                  <input className="input-field" placeholder="Category name (e.g. Alphanso)" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                  <input className="input-field" type="number" placeholder="Grade number (1, 2, 3...)" value={catForm.category_number} onChange={e => setCatForm({ ...catForm, category_number: e.target.value })} />
                  <input className="input-field" placeholder="Description (optional)" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} />
                  <button onClick={addCategory} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Category'}</button>
                </div>
              )}
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">Grade {c.category_number} {c.description ? `• ${c.description}` : ''}</p>
                  </div>
                  <span className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">{c.category_number}</span>
                </div>
              ))}
            </div>

            {/* Box Types */}
            <div className="card space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900">📦 Box Types</p>
                <button onClick={() => setShowAddBox(!showAddBox)} className="btn-sm">+ Add</button>
              </div>
              {showAddBox && (
                <div className="bg-mango-50 rounded-xl p-3 space-y-2">
                  <input className="input-field" placeholder="Brand name (e.g. Ambar)" value={boxForm.brand_name} onChange={e => setBoxForm({ ...boxForm, brand_name: e.target.value })} />
                  <select className="select-field" value={boxForm.size} onChange={e => setBoxForm({ ...boxForm, size: e.target.value })}>
                    <option value="5kg">5 kg</option>
                    <option value="10kg">10 kg</option>
                  </select>
                  <select className="select-field" value={boxForm.box_weight} onChange={e => setBoxForm({ ...boxForm, box_weight: e.target.value })}>
                    <option value="400g">400 g</option>
                    <option value="500g">500 g</option>
                  </select>
                  <button onClick={addBoxType} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Box Type'}</button>
                </div>
              )}
              {boxTypes.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-semibold text-gray-800">{b.brand_name}</p>
                  <span className="text-xs text-gray-500">{b.size} • {b.box_weight}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
