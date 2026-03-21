import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockAPI, salesAPI, paymentAPI, categoryAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/StatCard'
import { PageLoader } from '../../components/Spinner'
import { useLanguage } from '../../context/LanguageContext'

export default function ManagerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { fmtMoney, fmtDate } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [stockRes, salesRes, payRes, catRes] = await Promise.allSettled([
          stockAPI.get(),
          salesAPI.list(),
          paymentAPI.list(),
          categoryAPI.list(),
        ])

        const stock = stockRes.value?.data || { mango: [], empty_boxes: [] }
        const sales = salesRes.value?.data || []
        const payments = payRes.value?.data || []
        const cats = catRes.value?.data || []

        const totalMango = stock.mango.reduce((s, i) => s + i.available, 0)
        const totalBoxes = stock.empty_boxes.reduce((s, i) => s + i.available, 0)
        const totalSalesAmt = sales.reduce((s, i) => s + i.total_amount, 0)
        const pending = payments.filter(p => p.status !== 'paid')
        const pendingAmt = pending.reduce((s, p) => s + p.remaining_amount, 0)

        setData({ totalMango, totalBoxes, totalSales: sales.length, totalSalesAmt, pending: pending.length, pendingAmt, cats: cats.length, payments })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium">Good day,</p>
            <h1 className="text-2xl font-extrabold">{user?.username} 👋</h1>
            <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
              Manager
            </span>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl active:scale-95 transition-all">
            🚪
          </button>
        </div>

        {/* Big total card */}
        <div className="mt-5 bg-white/15 rounded-2xl p-4">
          <p className="text-primary-100 text-xs font-semibold uppercase tracking-wide">Total Revenue</p>
          <p className="text-3xl font-extrabold mt-0.5">{fmtMoney(data?.totalSalesAmt || 0)}</p>
          <p className="text-primary-100 text-xs mt-0.5">{data?.totalSales || 0} sales recorded</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <h2 className="section-title">Overview</h2>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="🥭" label="Mango Stock" value={`${data?.totalMango || 0} boxes`} color="green" />
          <StatCard icon="📦" label="Empty Boxes" value={`${data?.totalBoxes || 0}`} color="amber" />
          <StatCard icon="💳" label="Pending" value={data?.pending || 0} sub={fmtMoney(data?.pendingAmt || 0)} color="red" />
          <StatCard icon="🏷️" label="Categories" value={data?.cats || 0} sub="Mango types" color="purple" />
        </div>

        {/* Quick Actions */}
        <h2 className="section-title mt-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🛒', label: 'New Purchase', to: '/purchases' },
            { icon: '📊', label: 'View Stock', to: '/stock' },
            { icon: '💰', label: 'Payments', to: '/payments' },
            { icon: '🔔', label: 'Reminders', to: '/reminders' },
          ].map((a) => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className="card flex flex-col items-center gap-2 py-5 active:scale-95 transition-all">
              <span className="text-3xl">{a.icon}</span>
              <span className="text-xs font-semibold text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Recent payments */}
        {data?.payments?.length > 0 && (
          <>
            <h2 className="section-title mt-4">Recent Payments</h2>
            <div className="space-y-2">
              {data.payments.slice(0, 3).map(p => (
                <div key={p.id} className="card flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Sale #{p.sale_id}</p>
                    <p className="text-xs text-gray-400">Due: {fmtDate(p.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <span className={p.status === 'paid' ? 'badge-paid' : p.status === 'partial' ? 'badge-partial' : 'badge-pending'}>
                      {p.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{fmtMoney(p.remaining_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
