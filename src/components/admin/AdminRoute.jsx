import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { verifyAdminAccess } from '../../services/adminService.js'

export default function AdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [access, setAccess] = useState({ userId: null, status: 'checking', error: '' })

  useEffect(() => {
    let active = true
    let checking = false
    if (loading) return () => { active = false }
    if (!user) {
      setAccess({ userId: null, status: 'denied', error: '' })
      return () => { active = false }
    }
    setAccess({ userId: user.id, status: 'checking', error: '' })
    const verifyAccess = async () => {
      if (checking) return
      checking = true
      try {
        const result = await verifyAdminAccess()
        if (!active) return
        setAccess({ userId: user.id, status: result.status, error: result.error })
      } catch {
        if (active) setAccess({ userId: user.id, status: 'error', error: 'Could not verify administrator access. Check your connection and try again.' })
      } finally {
        checking = false
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void verifyAccess()
    }
    void verifyAccess()
    const intervalId = window.setInterval(verifyAccess, 30_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [user, loading])

  if (loading || access.status === 'checking' || (user && access.userId !== user.id)) {
    return <div className="container-page py-24 text-center" role="status">Verifying administrator access…</div>
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (access.status === 'denied') {
    return (
      <div className="container-page py-24 text-center">
        <p className="eyebrow text-muted">403 · Restricted</p>
        <h1 className="mt-3 text-4xl">Administrator access required</h1>
        <p className="mt-4 text-muted">This account is not authorized to access the SOLEVERSE admin dashboard.</p>
      </div>
    )
  }
  if (access.status === 'error') {
    return (
      <div className="container-page py-24 text-center" role="alert">
        <p className="eyebrow text-muted">Access check failed</p>
        <p className="mt-3">{access.error}</p>
      </div>
    )
  }
  return <Outlet />
}
