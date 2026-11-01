import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import DeliveryConfirmationCard from '../components/orders/DeliveryConfirmationCard.jsx'
import { useDeliveryNotifications } from '../context/DeliveryNotificationContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { fetchMyOrders } from '../services/orderService.js'
import { formatPrice } from '../utils/formatPrice.js'
import { paymentMethodLabel, paymentStatusLabel } from '../utils/paymentDisplay.js'
import { getOrderStatusLabel } from '../utils/orderTracking.js'

function formatOrderDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function MyOrders() {
  usePageTitle('My orders')
  const [state, setState] = useState({ status: 'loading', orders: [], error: '' })
  const {
    status: notificationStatus,
    notifications,
    error: notificationError,
    refresh: refreshNotifications,
  } = useDeliveryNotifications()

  const loadOrders = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    const { data, error } = await fetchMyOrders()
    setState(error
      ? { status: 'error', orders: [], error: error.message }
      : { status: 'ready', orders: data ?? [], error: '' })
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  return (
    <div className="container-page py-12 md:py-16">
      <Link to="/account" className="eyebrow underline underline-offset-4">← My account</Link>
      <p className="eyebrow mt-7 text-muted">Your purchases</p>
      <h1 className="mt-2 text-5xl sm:text-6xl">My Orders</h1>
      <p className="mt-4 max-w-2xl text-muted">Your saved orders and their latest status. Updates appear when you refresh this page.</p>

      {state.status === 'loading' && <p className="mt-8 text-sm text-muted" role="status">Loading your orders…</p>}

      {state.status === 'error' && (
        <div className="mt-8">
          <FormMessage tone="error">{state.error || 'Your orders could not be loaded. Please try again.'}</FormMessage>
          <Button className="mt-4" variant="outline" onClick={loadOrders}>Try again</Button>
        </div>
      )}

      <section id="delivery-confirmations" aria-labelledby="delivery-confirmations-heading" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="delivery-confirmations-heading" className="text-2xl font-semibold">Delivery notifications</h2>
          <Button variant="outline" onClick={refreshNotifications}>Refresh notifications</Button>
        </div>
        <p className="mt-2 text-sm text-muted">These in-site notifications are saved to your account and appear here when you sign in.</p>
        {notificationError && <FormMessage className="mt-4" tone="error">{notificationError}</FormMessage>}
        {notifications.length > 0 ? (
          <ul className="mt-5 space-y-4">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <DeliveryConfirmationCard
                  notification={notification}
                  refresh={refreshNotifications}
                  onChanged={loadOrders}
                />
              </li>
            ))}
          </ul>
        ) : notificationStatus === 'loading' ? (
          <p className="mt-4 text-sm text-muted" role="status">Checking for delivery notifications…</p>
        ) : !notificationError ? (
          <p className="mt-4 rounded-xl border border-dashed border-line p-5 text-sm text-muted">
            You have no delivery confirmation notifications.
          </p>
        ) : null}
      </section>

      {state.status === 'ready' && state.orders.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <h2 className="text-2xl">No orders yet</h2>
          <p className="mt-2 text-sm text-muted">Orders you place will appear here.</p>
          <Button to="/shop" className="mt-6">Explore the collection</Button>
        </div>
      )}

      {state.status === 'ready' && state.orders.length > 0 && (
        <ul className="mt-8 space-y-4">
          {state.orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="eyebrow text-muted">Order</p>
                  <h2 className="mt-1 break-all text-2xl font-semibold">{order.reference}</h2>
                  <p className="mt-2 text-sm text-muted">{formatOrderDate(order.created_at)}</p>
                  <p className="mt-2 text-sm">
                    {order.order_items?.length ?? 0} {order.order_items?.length === 1 ? 'item' : 'items'}
                    {' · '}
                    <span className="font-semibold">{getOrderStatusLabel(order.status)}</span>
                  </p>
                  <p className="mt-1 text-sm">{paymentMethodLabel(order)}</p>
                  <p className="text-xs text-muted">{paymentStatusLabel(order)}</p>
                  {order.demo_transaction && (
                    <p className="mt-1 break-all text-xs text-muted">
                      Payment reference {order.demo_transaction.transaction_reference}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-lg font-semibold">{formatPrice(order.total_inr)}</p>
                  <Button to={`/orders/${encodeURIComponent(order.reference)}`} variant="outline">Track order</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
