import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { partyAPI } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

const statusColor = {
  pending: 'bg-red-50 text-red-600 border-red-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
}

export default function Parties() {
  const { user } = useAuth()
  const { fmtMoney } = useLanguage()
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    partyAPI.list()
      .then(r => setParties(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load parties'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = parties.filter(p =>
    p.company_name.toLowerCase().includes(search.toLowerCase()) ||
    p.city_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalOwed = filtered.reduce((s, p) => s + p.total_amount_owed, 0)
  const totalPaid = filtered.reduce((s, p) => s + p.total_paid, 0)
  const totalRemaining = filtered.reduce((s, p) => s + p.total_remaining, 0)

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
        <h1 className="text-2xl font-extrabold">Parties / Suppliers</h1>
        <p className="text-primary-100 text-xs mt-1">Jis se saman liya unka hisab</p>
        {totalOwed > 0 && (
          <div className="flex gap-3 mt-3 flex-wrap">
            <div className="bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-primary-100">Total Owed</p>
              <p className="text-base font-extrabold">{fmtMoney(totalOwed)}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-primary-100">Paid</p>
              <p className="text-base font-extrabold text-green-300">{fmtMoney(totalPaid)}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2">
              <p className="text-xs text-primary-100">Remaining</p>
              <p className="text-base font-extrabold text-red-300">{fmtMoney(totalRemaining)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        <input className="input-field" placeholder="Search party or city..." value={search}
          onChange={e => setSearch(e.target.value)} />

        {filtered.length === 0 ? (
          parties.length === 0
            ? <EmptyState icon="🏭" title="No parties yet" subtitle="Create a purchase to see parties" />
            : <EmptyState icon="🔍" title="No results" subtitle={`No party matches "${search}"`} />
        ) : (
          filtered.map((p, i) => {
            const pct = p.total_amount_owed > 0 ? (p.total_paid / p.total_amount_owed) * 100 : 0
            const status = p.total_remaining <= 0 && p.total_amount_owed > 0 ? 'paid'
              : p.total_paid > 0 ? 'partial' : 'pending'
            return (
              <div key={i} className="card active:scale-[0.98] transition-all cursor-pointer"
                onClick={() => navigate(`/parties/${encodeURIComponent(p.company_name)}`)}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{p.company_name}</p>
                    <p className="text-xs text-gray-500">{p.city_name} • {p.total_purchases} purchases</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border capitalize ${statusColor[status]}`}>
                    {status}
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  {[
                    { label: 'Total', value: p.total_amount_owed, color: 'bg-gray-50 text-gray-700' },
                    { label: 'Paid', value: p.total_paid, color: 'bg-green-50 text-green-700' },
                    { label: 'Baki', value: p.total_remaining, color: p.total_remaining > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700' },
                  ].map(s => (
                    <div key={s.label} className={`flex-1 ${s.color} rounded-xl py-2 px-2 text-center`}>
                      <p className="text-xs font-bold">{fmtMoney(s.value)}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                {p.total_amount_owed > 0 && (
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                )}
                <div className="flex justify-between mt-1">
                  <p className="text-[10px] text-gray-400">{p.total_items_bought} items bought</p>
                  {p.total_amount_owed > 0 && <p className="text-[10px] text-gray-400">{pct.toFixed(0)}% paid</p>}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
