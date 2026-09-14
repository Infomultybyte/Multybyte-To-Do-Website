import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import LoadingScreen from './LoadingScreen'

/**
 * Gates a route behind an authenticated, active profile whose role is in
 * `allowedRoles`. Defaults to staff-only.
 *
 * Written generically on purpose: the Staff routes use
 * `allowedRoles={['staff']}` (or the default) and the Admin routes use
 * `allowedRoles={['admin']}` — same guard, same enforcement logic, for
 * both sections. Role is checked against the database-backed
 * `profiles.role`, not anything the client can influence, so a staff
 * account cannot reach an admin route (or vice versa) by editing the
 * URL or client state.
 *
 * - Not logged in -> /login
 * - Logged in but profile missing/inactive/wrong role -> /login
 */
export default function ProtectedRoute({ children, allowedRoles = ['staff'] }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const isAllowed = profile?.status === 'active' && allowedRoles.includes(profile?.role)

  if (!isAllowed) {
    return <Navigate to="/login" replace />
  }

  return children
}
