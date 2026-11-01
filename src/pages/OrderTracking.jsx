import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import OrderSummary from '../components/cart/OrderSummary.jsx'
import DeliveryConfirmationCard from '../components/orders/DeliveryConfirmationCard.jsx'
import { useDeliveryNotifications } from '../context/DeliveryNotificationContext.jsx'
import NotFound from './NotFound.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { fetchOrderByReference } from '../services/orderService.js'
import { formatPrice } from '../utils/formatPrice.js'
import { getOrderStatusLabel, getOrderTimeline, isOrderReference } from '../utils/orderTracking.js'
import { paymentMethodLabel, paymentStatusLabel } from '../utils/paymentDisplay.js'

function formatOrderDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' }).format(date)
}

function OrderTimeline({ status }) {
  const milestones = getOrderTimeline(status)
  return (
    <ol aria-label="Order status timeline" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {milestones.map((milestone) => (
        <li
          key={milestone.status}
          aria-current={milestone.current ? 'step' : undefined}
          className={`rounded-xl border p-4 text-sm ${
            milestone.completed
              ? 'border-ink bg-lime/40 text-ink'
              : 'border-line bg-canvas text-muted'
          }`}
        >
          <span className="block text-xs font-semibold uppercase tracking-wider">
            {milestone.completed ? 'Complete' : milestone.notRecorded ? 'Not recorded' : 'Upcoming'}
          </span>
          <span className="mt-1 block font-semibold">{milestone.label}</span>
        </li>
      ))}
    </ol>
  )
}

export default function OrderTracking() {
  const { reference = '' } = useParams()
  usePageTitle('Track order')
  const { notifications, error: notificationError, refresh: refreshNotifications } = useDeliveryNotifications()
  const [state, setState] = useState({ status: 'loading', order: null, error: '' })

  const loadOrder = useCallback(async () => {
    if (!isOrderReference(reference)) return
    setState({ status: 'loading', order: null, error: '' })
    const { data, error } = await fetchOrderByReference(reference)
    if (error) {
      setState({ status: 'error', order: null, error: error.message || 'Order details could not be loaded.' })
    } else if (!data) {
      setState({ status: 'missing', order: null, error: '' })
    } else {
      setState({ status: 'ready', order: data, error: '' })
    }
  }, [reference])

  useEffect(() => {
    if (isOrderReference(reference)) void loadOrder()
  }, [loadOrder, reference])

  if (!isOrderReference(reference)) return <NotFound />

  if (state.status === 'loading') {
    return <div className="container-page py-16 text-sm text-muted" role="status">Loading order tracking…</div>
  }

  if (state.status === 'missing') {
    return (
      <div className="container-page py-16">
        <FormMessage tone="info">
          We couldn’t find that order on your account. Check that you are signed in with the account that placed it.
        </FormMessage>
        <Button to="/orders" className="mt-5" variant="outline">Back to My Orders</Button>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="container-page py-16">
        <FormMessage tone="error">{state.error}</FormMessage>
        <Button className="mt-5" variant="outline" onClick={loadOrder}>Try again</Button>
      </div>
    )
  }

  const { order } = state
  const items = order.order_items ?? []
  const statusLabel = getOrderStatusLabel(order.status)

  return (
    <div className="container-page py-10 md:py-16">
      <Link to="/orders" className="eyebrow underline underline-offset-4">← My Orders</Link>
      <p className="eyebrow mt-7 text-muted">Order tracking</p>
      <h1 className="mt-2 break-all text-4xl sm:text-5xl">{order.reference}</h1>
      <p className="mt-3 text-sm text-muted">{formatOrderDate(order.created_at)}</p>

      <section aria-labelledby="tracking-status-heading" className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-muted">Current status</p>
            <h2 id="tracking-status-heading" className="mt-1 text-2xl">{statusLabel}</h2>
          </div>
          <Button variant="outline" onClick={loadOrder}>Refresh status</Button>
        </div>
        {order.status === 'cancelled' && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            This order was cancelled. The database stores the current status, not intermediate status history; delivery milestones are not marked complete.
          </div>
        )}
        {order.delivered_at && (
          <p className="mt-4 text-sm text-muted">Receipt confirmed by you on {formatOrderDate(order.delivered_at)}.</p>
        )}
        <OrderTimeline status={order.status} />
        <p className="mt-5 text-xs text-muted">
          Status is refreshed from your order record. Courier GPS tracking and delivery estimates are not available.
        </p>
      </section>

      {(notifications.some((notification) => notification.order_id === order.id) || notificationError) && (
        <section aria-labelledby="order-delivery-confirmation-heading" className="mt-7">
          <h2 id="order-delivery-confirmation-heading" className="mb-4 text-2xl">Delivery confirmation</h2>
          {notificationError && <FormMessage className="mb-4" tone="error">{notificationError}</FormMessage>}
          <div className="space-y-4">
            {notifications
              .filter((notification) => notification.order_id === order.id)
              .map((notification) => (
                <DeliveryConfirmationCard
                  key={notification.id}
                  notification={notification}
                  refresh={refreshNotifications}
                  onChanged={loadOrder}
                />
              ))}
          </div>
        </section>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="tracking-items-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <h2 id="tracking-items-heading" className="text-2xl">Items ordered</h2>
          {items.length ? (
            <ul className="mt-4 divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {item.color_label} · UK {item.size} · Qty {item.quantity}
                    </p>
                    <p className="mt-1 text-xs text-muted">{formatPrice(item.unit_price_inr)} each</p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.line_total_inr)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No item details are available for this order.</p>
          )}
        </section>

        <div className="space-y-5">
          <section aria-labelledby="tracking-delivery-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <h2 id="tracking-delivery-heading" className="text-2xl">Delivering to</h2>
            <address className="mt-4 text-sm not-italic leading-relaxed">
              <strong>{order.ship_full_name}</strong>
              <br />
              {order.ship_street}
              {order.ship_landmark && <><br />Landmark: {order.ship_landmark}</>}
              <br />
              {order.ship_city}, {order.ship_state} {order.ship_pin_code}
              <br />
              Phone: {order.ship_phone}
            </address>
          </section>
          <OrderSummary
            subtotal={order.subtotal_inr}
            deliveryFee={order.delivery_fee_inr}
            total={order.total_inr}
            title="Order total"
          />
          <section aria-label="Payment details" className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <p className="eyebrow text-muted">Payment</p>
            <p className="mt-2">{paymentMethodLabel(order)}</p>
            <p className="mt-1 text-muted">{paymentStatusLabel(order)}</p>
            {order.payment_method === 'simulated_online' && (
              <div className="mt-2 text-xs text-muted">
                <p>PAYMENT NOTICE — No real money was charged.</p>
                <p className="mt-1">Not a bank-confirmed payment.</p>
                {order.demo_transaction && <p className="mt-2 break-all">Transaction reference: {order.demo_transaction.transaction_reference}</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
