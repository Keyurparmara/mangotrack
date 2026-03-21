import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, loading } = useAuth()
  const { lang, setLang } = useLanguage()
  const [form, setForm] = useState({ username: '', password: '' })
  const [show, setShow] = useState(false)
  const [langChosen, setLangChosen] = useState(!!localStorage.getItem('lang'))

  const isGu = lang === 'gu'

  const handleLangSelect = (code) => {
    setLang(code)
    setLangChosen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      toast.error(isGu ? 'બધી માહિતી ભરો' : 'Please fill all fields')
      return
    }
    const res = await login(form.username.trim(), form.password)
    if (res.success) {
      toast.success(isGu ? 'ફરી સ્વાગત છે!' : 'Welcome back!')
      setTimeout(() => { window.location.href = '/dashboard' }, 300)
    } else {
      toast.error(res.message)
    }
  }

  // First time: ask language
  if (!langChosen) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 px-6">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-lg">
          🥭
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">Aazad</h1>
        <p className="text-primary-100 text-sm mb-10">Select your language / ભાષા પસંદ કરો</p>

        <div className="w-full max-w-xs space-y-3">
          <button onClick={() => handleLangSelect('en')}
            className="w-full bg-white text-primary-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-all shadow-card-lg">
            🇬🇧 English
          </button>
          <button onClick={() => handleLangSelect('gu')}
            className="w-full bg-white/15 border-2 border-white/30 text-white font-bold py-4 rounded-2xl text-lg active:scale-95 transition-all">
            🇮🇳 ગુજરાતી
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="page-header flex flex-col items-center py-14">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-5xl mb-4 shadow-lg"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.20)' }}>
          🥭
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Aazad</h1>
        <p className="text-primary-100 text-sm mt-1 font-medium">
          {isGu ? 'ઇન્વેન્ટ્રી મેનેજમેન્ટ સિસ્ટમ' : 'Inventory Management System'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 py-8 -mt-5 bg-surface rounded-t-[28px] relative z-10"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>

        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setLangChosen(false)}
            className="text-xs text-gray-400 font-semibold bg-gray-100 px-3 py-1.5 rounded-full">
            {isGu ? '🇬🇧 English' : '🇮🇳 ગુજ'}
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">{isGu ? 'લૉગ ઇન' : 'Sign In'}</h2>
        <p className="text-sm text-gray-400 mb-6">
          {isGu ? 'આગળ વધવા માટે ID દાખલ કરો' : 'Enter your credentials to continue'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{isGu ? 'વપરાશકર્તા નામ' : 'Username'}</label>
            <input
              className="input-field"
              placeholder={isGu ? 'ID દાખલ કરો' : 'Enter username'}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>

          <div>
            <label className="label">{isGu ? 'પાસવર્ડ' : 'Password'}</label>
            <div className="relative">
              <input
                className="input-field pr-12"
                type={show ? 'text' : 'password'}
                placeholder={isGu ? 'પાસવર્ડ દાખલ કરો' : 'Enter password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? (isGu ? 'લૉગ ઇન...' : 'Signing in...') : (isGu ? 'લૉગ ઇન' : 'Sign In')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-300 mt-8">
          Aazad v2.0 • by Keyur
        </p>
      </div>
    </div>
  )
}
