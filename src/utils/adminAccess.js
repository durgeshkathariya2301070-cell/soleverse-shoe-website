// The database RPC is the source of truth; only an explicit true grants admin status.
export function resolveAdminAccess(data, error) {
  if (error) return 'error'
  return data === true ? 'allowed' : 'denied'
}

export function shouldShowAdminDashboard(user, loading, access) {
  return Boolean(
    user &&
    !loading &&
    access?.userId === user.id &&
    access.status === 'allowed',
  )
}

export function getPostLoginPath(accessStatus, customerDestination = '/') {
  if (accessStatus === 'allowed') return '/admin'
  if (accessStatus === 'denied') return customerDestination
  return null
}
