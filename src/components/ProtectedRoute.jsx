import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Wrap pages that need a login. Logged-out visitors are sent to /login, and after they
// log in they are returned to the page they asked for (we pass it along as `from`).
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Wait until we know whether a saved login exists, otherwise a refresh would flash the login page.
  if (loading) {
    return (
      <div className="container-page py-32 text-center" role="status">
        <p className="eyebrow text-muted">Checking your login…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
