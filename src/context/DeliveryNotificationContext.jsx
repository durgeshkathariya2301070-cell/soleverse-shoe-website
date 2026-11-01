import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { fetchMyDeliveryNotifications } from '../services/deliveryConfirmationService.js'

const DeliveryNotificationContext = createContext(null)

export function DeliveryNotificationProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState({ status: 'idle', ownerId: null, notifications: [], error: '' })
  const requestSequence = useRef(0)

  const refresh = useCallback(async () => {
    if (authLoading || !user) {
      requestSequence.current += 1
      setState({ status: authLoading ? 'loading' : 'ready', ownerId: null, notifications: [], error: '' })
      return
    }
    const sequence = ++requestSequence.current
    setState((current) => ({
      status: 'loading',
      ownerId: user.id,
      notifications: current.ownerId === user.id ? current.notifications : [],
      error: '',
    }))
    const { data, error } = await fetchMyDeliveryNotifications()
    if (sequence !== requestSequence.current) return
    setState(error
      ? { status: 'error', ownerId: user.id, notifications: [], error }
      : { status: 'ready', ownerId: user.id, notifications: data ?? [], error: '' })
  }, [authLoading, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user) return undefined
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const interval = window.setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refresh, user])

  const notifications = state.ownerId === user?.id ? state.notifications : []
  const pendingCount = notifications.filter((notification) => notification.response === null).length
  const value = useMemo(() => ({
    ...state,
    notifications,
    error: state.ownerId === user?.id ? state.error : '',
    pendingCount,
    refresh,
  }), [state, notifications, user?.id, pendingCount, refresh])

  return (
    <DeliveryNotificationContext.Provider value={value}>
      {children}
    </DeliveryNotificationContext.Provider>
  )
}

export function useDeliveryNotifications() {
  const value = useContext(DeliveryNotificationContext)
  if (!value) throw new Error('useDeliveryNotifications must be used inside <DeliveryNotificationProvider> (see src/main.jsx)')
  return value
}
