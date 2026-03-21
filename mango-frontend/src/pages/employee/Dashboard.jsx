import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { salesAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/StatCard'
import { PageLoader } from '../../components/Spinner'
import { useLanguage } from '../../context/LanguageContext'

export default function EmployeeDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { fmtMoney, fmtDate } = useLanguage()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    salesAPI.getMySales()
      .then(r => setSales(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }, [])

  const totalAmt = sales.reduce((s, i) => s + i.total_amount, 0)
  const totalBoxes = sales.reduce((s, i) => s + i.quantity, 0)
  const today = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium">Welcome back,</p>
            <h1 className="text-2xl font-extrabold">{user?.username} 👋</h1>
            <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
              Employee
            </span>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl active:scale-95 transition-all">
            🚪
          </button>
        </div>
        <div className="mt-4 bg-white/15 rounded-2xl p-4">
          <p className="text-primary-100 text-xs font-semibold uppercase tracking-wide">My Total Sales</p>
          <p className="text-3xl font-extrabold mt-0.5">{fmtMoney(totalAmt)}</p>
          <p className="text-primary-100 text-xs mt-0.5">{sales.length} orders total</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <h2 className="section-title">My Stats</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="📦" label="Total Boxes Sold" value={totalBoxes} color="green" />
          <StatCard icon="📅" label="Today's Sales" value={today.length} color="amber" />
          <StatCard icon="🛒" label="Total Orders" value={sales.length} color="blue" />
          <StatCard icon="💰" label="Revenue" value={fmtMoney(totalAmt)} color="purple" />
        </div>

        {/* Quick Actions */}
        <h2 className="section-title mt-4">Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/create-sale')} className="card flex flex-col items-center gap-2 py-6 active:scale-95 transition-all">
            <span className="text-4xl">🥭</span>
            <span className="text-sm font-bold text-gray-700">New Sale</span>
          </button>
          <button onClick={() => navigate('/my-sales')} className="card flex flex-col items-center gap-2 py-6 active:scale-95 transition-all">
            <span className="text-4xl">📋</span>
            <span className="text-sm font-bold text-gray-700">My Sales</span>
          </button>
        </div>

        {/* Recent sales */}
        {sales.length > 0 && (
          <>
            <h2 className="section-title mt-4">Recent Sales</h2>
            <div className="space-y-2">
              {sales.slice(-3).reverse().map(s => (
                <div key={s.id} className="card flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Sale #{s.id} — {s.city}</p>
                    <p className="text-xs text-gray-400">{s.size} • {s.quantity} boxes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary-700">{fmtMoney(s.total_amount)}</p>
                    <p className="text-xs text-gray-400">{fmtDate(s.created_at)}</p>
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
