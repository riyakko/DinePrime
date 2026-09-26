import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function ProtectedRoute({ children, roles, customerOnly = false }) {
  const { loading, isAuthenticated, role } = useAuth()
  if (loading) return <div className="loading-state">Checking your session...</div>
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (customerOnly && role !== 'customer') return <Navigate to="/" replace />
  if (roles?.length && !roles.includes(role)) return <Navigate to="/" replace />
  return children
}
