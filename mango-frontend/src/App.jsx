import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import { useEffect, useState } from 'react'
import api from './api/api'

import Login from './pages/Login'
import Setup from './pages/Setup'
import Profile from './pages/Profile'
import Demo from './pages/Demo'
import Settings from './pages/Settings'
import Team from './pages/Team'
import SaleDetail from './pages/SaleDetail'

import ManagerDashboard from './pages/manager/Dashboard'
import Purchases from './pages/manager/Purchases'
import PurchaseDetail from './pages/manager/PurchaseDetail'
import AllSales from './pages/manager/AllSales'
import Stock from './pages/manager/Stock'
import Payments from './pages/manager/Payments'
import Reminders from './pages/manager/Reminders'
import Parties from './pages/manager/Parties'
import PartyDetail from './pages/manager/PartyDetail'
import TruckPayments from './pages/manager/TruckPayments'

import EmployeeDashboard from './pages/employee/Dashboard'
import CreateSale from './pages/employee/CreateSale'
import MySales from './pages/employee/MySales'
import EmployeeStock from './pages/employee/Stock'

function AppRoutes() {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-primary-600">
        <div className="text-5xl animate-bounce mb-3">🥭</div>
        <p className="text-white text-sm font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/demo"  element={<Demo />} />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

        {/* Dashboard — role based */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {user?.role === 'manager' || user?.role === 'owner' ? <ManagerDashboard /> : <EmployeeDashboard />}
          </ProtectedRoute>
        } />

        {/* Manager + Owner */}
        <Route path="/purchases"               element={<ProtectedRoute role="manager"><Purchases /></ProtectedRoute>} />
        <Route path="/purchases/:id"           element={<ProtectedRoute role="manager"><PurchaseDetail /></ProtectedRoute>} />
        <Route path="/stock"                   element={<ProtectedRoute role="manager"><Stock /></ProtectedRoute>} />
        <Route path="/payments"                element={<ProtectedRoute role="manager"><Payments /></ProtectedRoute>} />
        <Route path="/all-sales"               element={<ProtectedRoute role="manager"><AllSales /></ProtectedRoute>} />
        <Route path="/reminders"               element={<ProtectedRoute role="manager"><Reminders /></ProtectedRoute>} />
        <Route path="/parties"                 element={<ProtectedRoute role="manager"><Parties /></ProtectedRoute>} />
        <Route path="/parties/:name"           element={<ProtectedRoute role="manager"><PartyDetail /></ProtectedRoute>} />
        <Route path="/truck-payments"          element={<ProtectedRoute role="manager"><TruckPayments /></ProtectedRoute>} />

        {/* Shared (manager + employee) */}
        <Route path="/team"           element={<ProtectedRoute><Team /></ProtectedRoute>} />
        <Route path="/create-sale"    element={<ProtectedRoute><CreateSale /></ProtectedRoute>} />
        <Route path="/my-sales"       element={<ProtectedRoute role="employee"><MySales /></ProtectedRoute>} />
        <Route path="/employee-stock" element={<ProtectedRoute role="employee"><EmployeeStock /></ProtectedRoute>} />
        <Route path="/sales/:id"      element={<ProtectedRoute><SaleDetail /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>

      {user && <BottomNav />}
    </>
  )
}

function WarmupGate({ children }) {
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let timer
    const ping = async () => {
      try {
        await api.get('/health', { timeout: 8000 })
        setReady(true)
      } catch {
        setAttempt(a => a + 1)
        timer = setTimeout(ping, 3000)
      }
    }
    ping()
    return () => clearTimeout(timer)
  }, [])

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-primary-600 px-6 text-center">
        <div className="text-6xl mb-4" style={{ animation: 'bounce 1s infinite' }}>🥭</div>
        <p className="text-white text-lg font-extrabold mb-1">MangoTrack</p>
        {attempt === 0 ? (
          <p className="text-primary-100 text-sm">Loading...</p>
        ) : (
          <>
            <p className="text-white text-sm font-semibold">App warm ho rahi hai...</p>
            <p className="text-primary-200 text-xs mt-1">Pehli baar thoda time lagta hai (30-60 sec)</p>
            <div className="mt-4 flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-white/60 rounded-full"
                  style={{ animation: `bounce 1s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <WarmupGate>
          </WarmupGate>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: '600',
                maxWidth: '340px',
                padding: '12px 16px',
              },
              success: { style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } },
              error:   { style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
