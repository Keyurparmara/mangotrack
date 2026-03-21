import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api/api'

const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const b = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b.padEnd(b.length + (4 - (b.length % 4)) % 4, '=')
    return JSON.parse(atob(padded))
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [demoMode,  setDemoMode]  = useState(false)   // ← bypass all auth checks

  // Read from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      const token  = localStorage.getItem('token')
      if (stored && token) {
        const payload = parseJwt(token)
        if (payload && payload.exp * 1000 > Date.now()) {
          setUser(JSON.parse(stored))
        } else {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
        }
      }
    } catch {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    } finally {
      setAuthReady(true)
    }
  }, [])

  // (auth:logout listener removed — manual logout only)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const res   = await authAPI.login(username, password)
      const token = res.data.access_token
      const payload = parseJwt(token)
      if (!payload) return { success: false, message: 'Invalid token' }

      const role     = String(payload.role)
      const userData = { username, role, id: String(payload.sub) }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true, role }
    } catch (err) {
      return { success: false, message: err.response?.data?.detail || 'Login failed' }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setDemoMode(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authReady, demoMode, setDemoMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
