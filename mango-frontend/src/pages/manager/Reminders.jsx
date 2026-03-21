import { useEffect, useState } from 'react'
import { reminderAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

export default function Reminders() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(null)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await reminderAPI.list()
      setReminders(Array.isArray(res.data) ? res.data : [])
    } finally { setLoading(false) }
  }

  const markDone = async (id) => {
    setMarking(id)
    try {
      await reminderAPI.markDone(id)
      toast.success('Reminder marked done ✅')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setMarking(null) }
  }

  const filtered = filter === 'pending' ? reminders.filter(r => !r.is_done) : reminders.filter(r => r.is_done)

  const isOverdue = (dateStr) => new Date(dateStr) < new Date()
  const isToday = (dateStr) => {
    const d = new Date(dateStr), n = new Date()
    return d.toDateString() === n.toDateString()
  }

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
        <h1 className="text-2xl font-extrabold">Reminders 🔔</h1>
        <p className="text-primary-100 text-xs mt-1">1 day before due date</p>
        <div className="mt-3 flex gap-3">
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-extrabold">{reminders.filter(r => !r.is_done).length}</p>
            <p className="text-xs text-primary-100">Pending</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-extrabold">{reminders.filter(r => !r.is_done && isOverdue(r.reminder_date)).length}</p>
            <p className="text-xs text-primary-100">Overdue</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="flex gap-2">
          {['pending', 'done'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ` +
                (filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500')}>
              {f === 'pending' ? `⏳ Pending (${reminders.filter(r => !r.is_done).length})` : `✅ Done (${reminders.filter(r => r.is_done).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={filter === 'pending' ? '🎉' : '📭'} title={filter === 'pending' ? 'No pending reminders!' : 'No done reminders'} />
        ) : (
          filtered.map(r => {
            const overdue = isOverdue(r.reminder_date)
            const today = isToday(r.reminder_date)
            return (
              <div key={r.id} className={`card border-l-4 ${overdue && !r.is_done ? 'border-red-400' : today ? 'border-mango-400' : 'border-primary-400'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 text-sm">Payment #{r.payment_id}</p>
                      {overdue && !r.is_done && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">OVERDUE</span>}
                      {today && !overdue && <span className="text-[10px] bg-mango-100 text-mango-600 px-2 py-0.5 rounded-full font-bold">TODAY</span>}
                    </div>
                    <p className="text-xs text-gray-500">
                      Reminder: {new Date(r.reminder_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(r.reminder_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {!r.is_done && (
                    <button onClick={() => markDone(r.id)} disabled={marking === r.id}
                      className="bg-primary-50 text-primary-700 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all flex-shrink-0">
                      {marking === r.id ? '...' : '✅ Done'}
                    </button>
                  )}
                  {r.is_done && <span className="text-2xl">✅</span>}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
