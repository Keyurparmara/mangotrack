import { useEffect, useState } from 'react'
import { stockAPI } from '../../api/api'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'

export default function EmployeeStock() {
  const [stock, setStock] = useState({ mango: [], empty_boxes: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mango')

  useEffect(() => {
    stockAPI.get()
      .then(res => setStock(res.data || { mango: [], empty_boxes: [] }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm">Employee</p>
        <h1 className="text-2xl font-extrabold">Stock 📦</h1>
        <p className="text-primary-100 text-xs mt-1">Live inventory — purchase minus sales</p>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 gap-2">
        {['mango', 'boxes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ` +
              (tab === t ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-500')}>
            {t === 'mango' ? '🥭 Mango' : '📦 Boxes'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'mango' && (
          <>
            {stock.mango.length === 0 ? (
              <EmptyState icon="🥭" title="No mango stock" subtitle="Stock will appear here after purchases" />
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
                      { label: 'Available', value: item.available, color: item.available > 0 ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600' },
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
                  {item.available === 0 && (
                    <p className="text-xs text-red-500 font-semibold mt-2 text-center">❌ Stock khatam ho gaya</p>
                  )}
                  {item.available > 0 && item.available <= 10 && (
                    <p className="text-xs text-amber-600 font-semibold mt-2 text-center">⚠️ Sirf {item.available} boxes bache hain</p>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {tab === 'boxes' && (
          <>
            {stock.empty_boxes.length === 0 ? (
              <EmptyState icon="📦" title="No box stock" subtitle="Box stock will appear after purchases" />
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
      </div>
    </div>
  )
}
