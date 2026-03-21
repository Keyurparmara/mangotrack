import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, authReady, demoMode } = useAuth()

  // Demo mode — skip ALL auth checks, show page directly
  if (demoMode) return children

  // Wait for localStorage read
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-4xl animate-bounce">🥭</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Role check: owner can access all routes, manager can access employee routes too
  if (role) {
    const allowed =
      user.role === 'owner' ||
      user.role === role ||
      (role === 'employee' && user.role === 'manager')
    if (!allowed) return <Navigate to="/dashboard" replace />
  }

  return children
}
