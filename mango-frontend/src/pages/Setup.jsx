import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Setup() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'owner1', password: 'owner123', role: 'owner' })
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.detail || 'Kuch galat hua')
      }
    } catch {
      setError('Server se connect nahi ho saka')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-primary-600 flex flex-col items-center justify-center px-6">
      <div className="text-6xl mb-4">🥭</div>
      <h1 className="text-2xl font-extrabold text-white mb-1">Aazad Setup</h1>
      <p className="text-primary-100 text-sm mb-8 text-center">Pehli baar setup karo</p>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl space-y-4">
        {done ? (
          <>
            <div className="text-center space-y-3">
              <div className="text-5xl">✅</div>
              <p className="font-bold text-gray-900 text-lg">Owner account ban gaya!</p>
              <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-1">
                <p className="text-sm text-gray-600">Username: <span className="font-bold text-gray-900">owner1</span></p>
                <p className="text-sm text-gray-600">Password: <span className="font-bold text-gray-900">owner123</span></p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-base"
              >
                Login karo →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-700 text-sm text-center">
              Ye button dabao — owner account ban jayega aur app ready ho jayega.
            </p>
            <div className="bg-primary-50 rounded-2xl p-3 space-y-1">
              <p className="text-xs text-primary-700 font-semibold">Jo account banega:</p>
              <p className="text-sm text-primary-800">👤 owner1 / owner123</p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                <p className="text-sm text-red-600 font-semibold">{error}</p>
                {error.includes('already') && (
                  <button onClick={() => navigate('/login')} className="mt-2 text-sm text-primary-600 font-bold underline">
                    Login karo →
                  </button>
                )}
              </div>
            )}
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Ban raha hai...' : '🚀 Setup Karo'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
