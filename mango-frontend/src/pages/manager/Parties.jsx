import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { partyAPI, salesAPI } from '../../api/api'
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
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('customers') // customers | suppliers
  const navigate = useNavigate()

  useEffect(() => {
    Promise.allSettled([partyAPI.list(), salesAPI.getCustomers()])
      .then(([pRes, cRes]) => {
        setParties(Array.isArray(pRes.value?.data) ? pRes.value.data : [])
        setCustomers(Array.isArray(cRes.value?.data) ? cRes.value.data : [])
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filteredParties = parties.filter(p =>
    p.company_name.toLowerCase().includes(search.toLowerCase()) ||
    p.city_name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCustomers = customers.filter(c =>
    (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_village || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalOwed = filteredParties.reduce((s, p) => s + p.total_amount_owed, 0)
  const totalPaid = filteredParties.reduce((s, p) => s + p.total_paid, 0)
  const totalCustomerAmt = filteredCustomers.reduce((s, c) => s + c.total_amount, 0)

  if (loading) return <PageLoader />

  return (
    <div className="pb-24">
      <div className="page-header">
        <p className="text-primary-100 text-sm capitalize">{user?.role || 'Manager'}</p>
        <h1 className="text-2xl font-extrabold">Parties</h1>
        <div className="flex gap-3 mt-3 flex-wrap">
          {tab === 'customers' ? (
            <>
              <div className="bg-white/15 rounded-xl px-3 py-2">
                <p className="text-xs text-primary-100">Customers</p>
                <p className="text-base font-extrabold">{filteredCustomers.length}</p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2">
                <p className="text-xs text-primary-100">Total Sales</p>
                <p className="text-base font-extrabold">{fmtMoney(totalCustomerAmt)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white/15 rounded-xl px-3 py-2">
                <p className="text-xs text-primary-100">Total Owed</p>
                <p className="text-base font-extrabold">{fmtMoney(totalOwed)}</p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2">
                <p className="text-xs text-primary-100">Paid</p>
                <p className="text-base font-extrabold text-green-300">{fmtMoney(totalPaid)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button onClick={() => setTab('customers')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${tab === 'customers' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            🧑 Customers
          </button>
          <button onClick={() => setTab('suppliers')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${tab === 'suppliers' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            🏭 Suppliers
          </button>
        </div>

        <input className="input-field"
          placeholder={tab === 'customers' ? 'Search customer or village...' : 'Search supplier or city...'}
          value={search} onChange={e => setSearch(e.target.value)} />

        {/* Customers Tab */}
        {tab === 'customers' && (
          filteredCustomers.length === 0 ? (
            customers.length === 0
              ? <EmptyState icon="🧑" title="No customers yet" subtitle="Create a sale with customer name to see them here" />
              : <EmptyState icon="🔍" title="No results" subtitle={`No customer matches "${search}"`} />
          ) : (
            filteredCustomers.map((c, i) => (
              <div key={i} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{c.customer_name}</p>
                    {c.customer_village && <p className="text-xs text-gray-500">{c.customer_village}</p>}
                    {c.customer_phone && (
                      <a href={`tel:${c.customer_phone}`} className="text-xs text-blue-500 font-semibold"
                        onClick={e => e.stopPropagation()}>
                        📞 {c.customer_phone}
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-primary-700">{fmtMoney(c.total_amount)}</p>
                    <p className="text-xs text-gray-400">{c.total_sales} order{c.total_sales !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {/* Suppliers Tab */}
        {tab === 'suppliers' && (
          filteredParties.length === 0 ? (
            parties.length === 0
              ? <EmptyState icon="🏭" title="No suppliers yet" subtitle="Create a purchase to see suppliers" />
              : <EmptyState icon="🔍" title="No results" subtitle={`No supplier matches "${search}"`} />
          ) : (
            filteredParties.map((p, i) => {
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
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-[10px] text-gray-400">{p.total_items_bought} items bought</p>
                    {p.total_amount_owed > 0 && <p className="text-[10px] text-gray-400">{pct.toFixed(0)}% paid</p>}
                  </div>
                </div>
              )
            })
          )
        )}
      </div>
    </div>
  )
}
