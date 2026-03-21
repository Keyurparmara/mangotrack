import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SCREENS = [
  { icon: '🏠', label: 'Manager Dashboard', sub: 'Stock overview, revenue, quick actions', path: '/dashboard' },
  { icon: '🛒', label: 'Purchases',          sub: 'Add mango & empty box purchases',       path: '/purchases' },
  { icon: '📦', label: 'Stock',              sub: 'Live mango & box inventory',             path: '/stock' },
  { icon: '💳', label: 'Payments',           sub: 'Pending, partial, paid tracking',        path: '/payments' },
  { icon: '🔔', label: 'Reminders',          sub: 'Upcoming due date alerts',               path: '/reminders' },
]

export default function Demo() {
  const { login, logout, setDemoMode } = useAuth()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Step 1: clear any existing session
    logout()
    setDemoMode(false)

    // Step 2: login as manager + enable demoMode
    const init = async () => {
      const res = await login('manager1', 'pass123')
      if (res.success) {
        setDemoMode(true)   // ← ProtectedRoute will now skip all auth checks
        setReady(true)
      } else {
        setError('Backend not reachable — run: uvicorn main:app --port 8000 --reload')
      }
    }
    init()

    // When leaving demo page, disable demo mode
    return () => setDemoMode(false)
  }, [])

  const open = (path) => {
    navigate(path)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">

      {/* Header */}
      <div className="px-5 pt-14 pb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🥭</div>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">MangoTrack</h1>
            <p className="text-primary-100 text-xs font-medium">Live Demo — No login needed</p>
          </div>
        </div>

        {!ready && !error && (
          <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-white text-xs font-medium">Connecting to server...</p>
          </div>
        )}

        {ready && (
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-3">
            <span className="text-base">✅</span>
            <p className="text-white text-xs font-medium">Connected — tap any screen to open</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/30 rounded-xl px-4 py-3">
            <p className="text-white text-xs font-bold mb-1">⚠️ Connection failed</p>
            <p className="text-primary-100 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Screen cards */}
      <div className="flex-1 bg-white rounded-t-3xl px-4 py-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">
          Choose a screen to preview
        </p>

        <div className="space-y-3">
          {SCREENS.map((s) => (
            <button
              key={s.path}
              disabled={!ready}
              onClick={() => open(s.path)}
              className={`w-full flex items-center gap-4 border-2 rounded-2xl px-4 py-4 text-left transition-all
                ${ready
                  ? 'bg-white border-gray-100 shadow-sm active:scale-95 active:border-primary-300'
                  : 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'}`}
            >
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
              {ready && <span className="text-primary-400 text-xl font-light">›</span>}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setDemoMode(false); navigate('/login') }}
          className="w-full text-center text-xs text-gray-400 py-4 mt-2 active:text-gray-600"
        >
          Go to real login page →
        </button>
      </div>
    </div>
  )
}
