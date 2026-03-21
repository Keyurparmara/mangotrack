import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success(lang === 'gu' ? 'Logout thaya!' : 'Logged out!')
  }

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm">
          {user?.role === 'owner' ? 'Owner' : user?.role === 'manager' ? 'Manager' : 'Employee'}
        </p>
        <h1 className="text-2xl font-extrabold">{t('Settings')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Profile */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">Account</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-700">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">Language / ભાષા</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { code: 'en', label: '🇬🇧 English' },
              { code: 'gu', label: '🇮🇳 ગુજરાતી' },
            ].map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); toast.success(l.code === 'gu' ? 'ભાષા બદલી!' : 'Language changed!') }}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ` +
                  (lang === l.code ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {lang === 'gu' ? 'ગુજરાતી ભાષા ચાલુ છે' : 'Currently showing in English'}
          </p>
        </div>

        {/* Help */}
        <div className="card space-y-3">
          <p className="font-bold text-gray-900">{t('Help & Support')}</p>
          <div className="flex items-center gap-3 bg-primary-50 rounded-xl p-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white text-lg">K</div>
            <div>
              <p className="font-semibold text-gray-800">Keyur</p>
              <p className="text-xs text-gray-500">{lang === 'gu' ? 'વ્યવસ્થાપક / Developer' : 'Admin / Developer'}</p>
            </div>
            <a href="tel:+919427217495"
              className="ml-auto bg-primary-600 text-white rounded-xl px-3 py-2 text-xs font-bold active:scale-95 transition-all">
              Call
            </a>
          </div>
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl">
              📱
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">+91 9427217495</p>
              <p className="text-xs text-gray-400">{lang === 'gu' ? 'ફોન / WhatsApp' : 'Phone / WhatsApp'}</p>
            </div>
            <a href="https://wa.me/919427217495"
              className="ml-auto bg-green-500 text-white rounded-xl px-3 py-2 text-xs font-bold active:scale-95 transition-all">
              WA
            </a>
          </div>
        </div>

        {/* App info */}
        <div className="card space-y-1">
          <p className="font-bold text-gray-900">{lang === 'gu' ? 'App ની માહિતી' : 'App Info'}</p>
          <p className="text-xs text-gray-500">MangoTrack v2.0</p>
          <p className="text-xs text-gray-400">{lang === 'gu' ? 'Mango Inventory Management System' : 'Mango Inventory Management System'}</p>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-base border border-red-200 active:scale-[0.98] transition-all">
          {t('Logout')}
        </button>
      </div>
    </div>
  )
}
