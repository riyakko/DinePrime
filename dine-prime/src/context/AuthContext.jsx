import { useEffect, useMemo, useState } from 'react'
import { getSession, loginUser, logoutUser, registerUser, updateProfile } from '../api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then((data) => setUser(data.authenticated ? data.user : null)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({
    user,
    role: user?.role || 'customer',
    isAuthenticated: Boolean(user),
    isStaff: user?.role === 'staff' || user?.role === 'admin',
    loading,
    login: async (credentials) => { const data = await loginUser(credentials); setUser(data.user); return data.user },
    register: async (details) => { const data = await registerUser(details); setUser(data.user); return data.user },
    updateProfile: async (details) => { const data = await updateProfile(details); setUser(data.user); return data.user },
    logout: async () => { await logoutUser(); setUser(null) },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

