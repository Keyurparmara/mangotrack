import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function BottomNav() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const ownerNav = [
    { to: '/dashboard',      icon: '🏠', label: 'Home' },
    { to: '/team',           icon: '👥', label: 'Team' },
    { to: '/all-sales',      icon: '🥭', label: 'Sales' },
    { to: '/stock',          icon: '📦', label: 'Stock' },
    { to: '/settings',       icon: '⚙️', label: 'Settings' },
  ]

  const managerNav = [
    { to: '/dashboard',      icon: '🏠', label: 'Home' },
    { to: '/purchases',      icon: '🛒', label: 'Purchase' },
    { to: '/create-sale',    icon: '➕', label: 'New Sale' },
    { to: '/all-sales',      icon: '🥭', label: 'Sales' },
    { to: '/parties',        icon: '🏭', label: 'Parties' },
    { to: '/truck-payments', icon: '🚚', label: 'Trucks' },
    { to: '/stock',          icon: '📦', label: 'Stock' },
    { to: '/settings',       icon: '⚙️', label: 'Settings' },
  ]

  const employeeNav = [
    { to: '/dashboard',      icon: '🏠', label: 'Home' },
    { to: '/create-sale',    icon: '🥭', label: 'New Sale' },
    { to: '/my-sales',       icon: '📋', label: 'My Sales' },
    { to: '/employee-stock', icon: '📦', label: 'Stock' },
    { to: '/settings',       icon: '⚙️', label: 'Settings' },
  ]

  const allNav = user?.role === 'owner' ? ownerNav
    : user?.role === 'manager' ? managerNav
    : employeeNav

  const go = (to) => { navigate(to); setOpen(false) }

  const isActive = (to) =>
    to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(to)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-up menu sheet */}
      {open && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white rounded-t-3xl z-50 px-4 pt-3 pb-6"
          style={{ bottom: '64px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Menu</p>
          <div className="grid grid-cols-4 gap-2">
            {allNav.map(item => {
              const active = isActive(item.to)
              return (
                <button
                  key={item.to}
                  onClick={() => go(item.to)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-95 ${
                    active ? 'bg-primary-50' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-2xl leading-none">{item.icon}</span>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${
                    active ? 'text-primary-700' : 'text-gray-500'
                  }`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center px-2 py-2 pb-safe">
          {/* Home */}
          <NavLink
            to="/dashboard"
            className={({ isActive: a }) =>
              `flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all ` +
              (a ? 'text-primary-700 bg-primary-50' : 'text-gray-400 active:bg-gray-50')
            }
          >
            <span className="text-xl leading-none">🏠</span>
            <span className="text-[9px] font-semibold">Home</span>
          </NavLink>

          {/* Quick action: New Sale (manager & employee) */}
          {(user?.role === 'manager' || user?.role === 'employee') && (
            <NavLink
              to="/create-sale"
              className={({ isActive: a }) =>
                `flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all ` +
                (a ? 'text-primary-700 bg-primary-50' : 'text-gray-400 active:bg-gray-50')
              }
            >
              <span className="text-xl leading-none">➕</span>
              <span className="text-[9px] font-semibold">New Sale</span>
            </NavLink>
          )}

          {/* Three-dot menu */}
          <button
            onClick={() => setOpen(o => !o)}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all ${
              open ? 'text-primary-700 bg-primary-50' : 'text-gray-400 active:bg-gray-50'
            }`}
          >
            <div className="flex gap-1 items-center" style={{ height: 22 }}>
              <div className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-primary-600' : 'bg-gray-400'}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-primary-600' : 'bg-gray-400'}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-primary-600' : 'bg-gray-400'}`} />
            </div>
            <span className="text-[9px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
