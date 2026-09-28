import { createContext, useEffect, useMemo, useState } from 'react'
import { getSession, loginUser, logoutUser, registerUser, updateProfile } from '../api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Synchronously restore user from localStorage to prevent logout flash on reload
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('dinePrimeUser')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const setPersistedUser = (userData) => {
    setUser(userData)
    if (userData) {
      localStorage.setItem('dinePrimeUser', JSON.stringify(userData))
    } else {
      localStorage.removeItem('dinePrimeUser')
    }
  }

  // Verify backend session on mount
  useEffect(() => {
    getSession()
      .then((data) => {
        if (data.authenticated && data.user) {
          setPersistedUser(data.user)
        } else {
          setPersistedUser(null)
        }
      })
      .catch(() => {
        // Retain local state if server is temporarily unreachable
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => {
    const normalizedRole = (user?.role || 'customer').toLowerCase()
    const isStaff = ['admin', 'staff', 'manager', 'kitchen'].includes(normalizedRole)

    return {
      user,
      role: normalizedRole,
      isAuthenticated: Boolean(user),
      isStaff,
      loading,
      login: async (credentials) => {
        const data = await loginUser(credentials)
        setPersistedUser(data.user)
        return data.user
      },
      register: async (details) => {
        const data = await registerUser(details)
        setPersistedUser(data.user)
        return data.user
      },
      updateProfile: async (details) => {
        const data = await updateProfile(details)
        setPersistedUser(data.user)
        return data.user
      },
      logout: async () => {
        try {
          await logoutUser()
        } finally {
          setPersistedUser(null)
        }
      },
    }
  }, [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}