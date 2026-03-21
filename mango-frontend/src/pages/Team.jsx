import { useEffect, useState } from 'react'
import { authAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/Spinner'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

const initForm = { username: '', password: '', role: 'employee' }

export default function Team() {
  const { user } = useAuth()
  const { fmtDate } = useLanguage()
  const isOwner = user?.role === 'owner'

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)

  // Password change state
  const [changePwdFor, setChangePwdFor] = useState(null) // user id
  const [newPwd, setNewPwd] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAPI.getTeam()
      setMembers(res.data || [])
    } catch {
      toast.error('Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.username.trim() || form.username.length < 3) {
      toast.error('Username kam se kam 3 characters ka hona chahiye'); return
    }
    if (!form.password || form.password.length < 6) {
      toast.error('Password kam se kam 6 characters ka hona chahiye'); return
    }
    setSaving(true)
    try {
      await authAPI.register({ username: form.username.trim(), password: form.password, role: form.role })
      toast.success(`${form.role === 'manager' ? 'Manager' : 'Employee'} create ho gaya! 🎉`)
      setForm(initForm)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (userId) => {
    if (!newPwd || newPwd.length < 6) {
      toast.error('Password kam se kam 6 characters ka hona chahiye'); return
    }
    setPwdSaving(true)
    try {
      await authAPI.changePassword(userId, newPwd)
      toast.success('Password badal diya! ✅')
      setChangePwdFor(null)
      setNewPwd('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setPwdSaving(false) }
  }

  const managers = members.filter(m => m.role === 'manager')
  const employees = members.filter(m => m.role === 'employee')

  if (loading) return <PageLoader />

  // Inline password change form
  const PwdForm = ({ userId }) => (
    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-amber-700">New Password set karo</p>
      <div className="relative">
        <input
          className="input-field pr-10 text-sm"
          type={showNewPwd ? 'text' : 'password'}
          placeholder="Min 6 characters"
          value={newPwd}
          onChange={e => setNewPwd(e.target.value)}
          autoFocus
        />
        <button type="button" onClick={() => setShowNewPwd(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
          {showNewPwd ? '🙈' : '👁️'}
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleChangePassword(userId)} disabled={pwdSaving}
          className="btn-sm flex-1 py-2 text-sm">
          {pwdSaving ? 'Saving...' : '✅ Save'}
        </button>
        <button onClick={() => { setChangePwdFor(null); setNewPwd('') }}
          className="flex-1 py-2 text-sm bg-gray-100 rounded-xl font-semibold text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  )

  // User card with password change button (owner only)
  const UserCard = ({ member, indent = false }) => (
    <div className={`${indent ? 'ml-10' : ''} space-y-0`}>
      <div className="flex items-center gap-2">
        {!indent && (
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
            member.role === 'manager' ? 'bg-primary-100' : 'bg-mango-50'
          }`}>
            {member.role === 'manager' ? '🧑‍💼' : '👷'}
          </span>
        )}
        {indent && (
          <span className="w-6 h-6 bg-mango-50 rounded-full flex items-center justify-center text-xs">👷</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{member.username}</p>
          <p className="text-xs text-gray-400 capitalize">{member.role} • ID: {member.id}</p>
        </div>
        {isOwner && (
          <button
            onClick={() => {
              if (changePwdFor === member.id) { setChangePwdFor(null); setNewPwd('') }
              else { setChangePwdFor(member.id); setNewPwd('') }
            }}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${
              changePwdFor === member.id
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500 active:bg-amber-50 active:text-amber-600'
            }`}
          >
            🔑 Pass
          </button>
        )}
      </div>
      {isOwner && changePwdFor === member.id && <PwdForm userId={member.id} />}
    </div>
  )

  return (
    <div className="pb-24">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">{isOwner ? 'Owner' : 'Manager'}</p>
            <h1 className="text-2xl font-extrabold">Team 👥</h1>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setForm({ ...initForm, role: isOwner ? 'manager' : 'employee' }) }}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all">
            {showForm ? '← Back' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Create Form */}
        {showForm && (
          <div className="card space-y-3">
            <p className="font-bold text-gray-900">➕ New {isOwner ? 'Member' : 'Employee'}</p>

            {isOwner && (
              <div>
                <label className="label">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['manager', 'employee'].map(r => (
                    <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 capitalize ` +
                        (form.role === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                      {r === 'manager' ? '🧑‍💼 Manager' : '👷 Employee'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">Username</label>
              <input
                className="input-field"
                placeholder={isOwner && form.role === 'manager' ? 'e.g. manager2' : 'e.g. emp2'}
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input-field"
                type="text"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : `✅ Create ${form.role === 'manager' ? 'Manager' : 'Employee'}`}
            </button>
          </div>
        )}

        {/* Stats */}
        {!showForm && (
          <div className="flex gap-3">
            {isOwner && (
              <div className="flex-1 bg-primary-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-primary-700">{managers.length}</p>
                <p className="text-xs text-primary-500 font-semibold">Managers</p>
              </div>
            )}
            <div className="flex-1 bg-mango-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-mango-600">{employees.length}</p>
              <p className="text-xs text-mango-500 font-semibold">Employees</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-gray-700">{members.length}</p>
              <p className="text-xs text-gray-500 font-semibold">Total</p>
            </div>
          </div>
        )}

        {/* Owner view: managers with their employees */}
        {!showForm && isOwner && managers.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Managers</p>
            {managers.map(m => {
              const empUnder = employees.filter(e => e.parent_id === m.id)
              return (
                <div key={m.id} className="card space-y-3">
                  <UserCard member={m} />
                  {empUnder.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-gray-50">
                      {empUnder.map(e => <UserCard key={e.id} member={e} indent />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Employees without a manager (owner view) */}
        {!showForm && isOwner && employees.filter(e => !e.parent_id).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Employees (No Manager)</p>
            {employees.filter(e => !e.parent_id).map(e => (
              <div key={e.id} className="card">
                <UserCard member={e} />
              </div>
            ))}
          </div>
        )}

        {/* Manager view: own employees */}
        {!showForm && !isOwner && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Meri Team</p>
            {employees.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-3xl mb-2">👷</p>
                <p className="font-bold text-gray-700">Koi employee nahi abhi</p>
                <p className="text-xs text-gray-400 mt-1">+ Add se employee banao</p>
              </div>
            ) : (
              employees.map(e => (
                <div key={e.id} className="card flex items-center gap-3">
                  <span className="w-9 h-9 bg-mango-50 rounded-full flex items-center justify-center text-base">👷</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{e.username}</p>
                    <p className="text-xs text-gray-400">Employee • ID: {e.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Since</p>
                    <p className="text-xs font-semibold text-gray-600">{fmtDate(e.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
