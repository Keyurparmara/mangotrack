import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm">Account</p>
        <h1 className="text-2xl font-extrabold">Profile 👤</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Avatar */}
        <div className="card flex flex-col items-center py-8 gap-3">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-700 rounded-full flex items-center justify-center text-4xl">
            {user?.role === 'manager' ? '👔' : '👷'}
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-gray-900">{user?.username}</p>
            <span className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold ` +
              (user?.role === 'manager' ? 'bg-primary-100 text-primary-700' : 'bg-mango-100 text-mango-600')}>
              {user?.role === 'manager' ? '👔 Manager' : '👷 Employee'}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">Account Info</p>
          {[
            { icon: '👤', label: 'Username', value: user?.username },
            { icon: '🎭', label: 'Role', value: user?.role },
            { icon: '🆔', label: 'User ID', value: `#${user?.id}` },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm text-gray-500">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-800 capitalize">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Permissions */}
        <div className="card space-y-2">
          <p className="font-bold text-gray-900">Permissions</p>
          {user?.role === 'manager' ? (
            ['View all sales', 'Create purchases', 'Manage stock', 'View payments', 'See reminders'].map(p => (
              <div key={p} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-primary-500">✓</span> {p}
              </div>
            ))
          ) : (
            ['Create new sales', 'View own sales only'].map(p => (
              <div key={p} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-primary-500">✓</span> {p}
              </div>
            ))
          )}
        </div>

        <button onClick={handleLogout} className="btn-danger w-full py-4 text-base font-bold">
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}
