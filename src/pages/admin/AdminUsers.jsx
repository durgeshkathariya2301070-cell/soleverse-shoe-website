import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../../components/Button.jsx'
import {
  fetchAdminUsers,
  grantAdminAccess,
  revokeAdminAccess,
  searchAdminUsers,
} from '../../services/adminService.js'

export default function AdminUsers() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState([])
  const [email, setEmail] = useState('')
  const [matches, setMatches] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [actingOn, setActingOn] = useState('')

  async function refreshAdmins() {
    setLoading(true)
    const result = await fetchAdminUsers()
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return false
    }
    setAdmins(result.data ?? [])
    return true
  }

  useEffect(() => {
    void refreshAdmins()
  }, [])

  async function handleSearch(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    setMatches([])
    setSearching(true)
    const result = await searchAdminUsers(email.trim())
    setSearching(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMatches(result.data ?? [])
    if (!result.data?.length) setMessage('No eligible account matched that email; it may already be an administrator.')
  }

  async function handleGrant(target) {
    if (!window.confirm(`Grant administrator access to ${target.email}?`)) return
    setMessage('')
    setError('')
    setActingOn(target.user_id)
    const result = await grantAdminAccess(target.user_id)
    setActingOn('')
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage(`Administrator access granted to ${target.email}.`)
    setMatches((current) => current.filter((match) => match.user_id !== target.user_id))
    await refreshAdmins()
  }

  async function handleRevoke(admin) {
    if (!window.confirm(`Revoke administrator access from ${admin.email}?`)) return
    setMessage('')
    setError('')
    setActingOn(admin.user_id)
    const result = await revokeAdminAccess(admin.user_id)
    setActingOn('')
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage(`Administrator access revoked from ${admin.email}.`)
    await refreshAdmins()
  }

  return (
    <div>
      <p className="eyebrow text-muted">Access control</p>
      <h2 className="mt-2 text-4xl">Admin users</h2>
      <p className="mt-3 text-sm text-muted">
        Search for an existing account by email. Access changes are checked by Supabase and take effect on
        subsequent admin authorization checks.
      </p>

      {message && <p className="mt-5 rounded-xl border border-green-300 bg-white p-3 text-sm" role="status">{message}</p>}
      {error && <p className="mt-5 rounded-xl border border-red-300 bg-white p-3 text-sm text-red-800" role="alert">{error}</p>}

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="admin-user-email">Registered user's email</label>
        <input
          id="admin-user-email"
          type="text"
          inputMode="email"
          autoComplete="off"
          required
          minLength={3}
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Search by email (3 or more characters)"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-ink"
        />
        <Button type="submit" variant="dark" disabled={searching}>
          {searching ? 'Searching…' : 'Search users'}
        </Button>
      </form>

      {matches.length > 0 && (
        <section className="mt-6" aria-labelledby="search-results-heading">
          <h3 id="search-results-heading" className="text-2xl">Matching accounts</h3>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {matches.map((match) => (
              <li key={match.user_id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <span className="break-all text-sm">{match.email}</span>
                <Button
                  variant="outline"
                  disabled={Boolean(actingOn)}
                  onClick={() => handleGrant(match)}
                >
                  {actingOn === match.user_id ? 'Granting…' : 'Grant admin access'}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="current-admins-heading">
        <h3 id="current-admins-heading" className="text-2xl">Current admins</h3>
        {loading && <p className="mt-4 text-sm text-muted" role="status">Loading administrators…</p>}
        {!loading && admins.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {admins.map((admin) => (
              <li key={admin.user_id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="break-all text-sm font-semibold">{admin.email || 'Email unavailable'}</p>
                  {admin.user_id === user?.id && <p className="mt-1 text-xs text-muted">Your account</p>}
                </div>
                <Button
                  variant="outline"
                  disabled={Boolean(actingOn) || admin.user_id === user?.id}
                  onClick={() => handleRevoke(admin)}
                >
                  {actingOn === admin.user_id ? 'Revoking…' : 'Revoke admin access'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
