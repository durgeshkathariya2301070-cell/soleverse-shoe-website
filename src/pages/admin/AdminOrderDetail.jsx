import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import { fetchAdminOrder, updateAdminOrderStatus } from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatPrice.js'
import { getOrderStatusLabel } from '../../utils/orderTracking.js'
import { paymentMethodLabel, paymentStatusLabel, demoTransactionTimestamp } from '../../utils/paymentDisplay.js'

const transitions = {
  placed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['shipped'],
  delivered: [],
  completed: [],
  cancelled: [],
}
const statusOptionLabels = {
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  cancelled: 'Cancelled',
}
const date = (value) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))

export default function AdminOrderDetail() {
  const { orderId } = useParams()
  const [state, setState] = useState({ status: 'loading', order: null, error: '', refreshError: '' })
  const [nextStatus, setNextStatus] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState((current) => ({ ...current, status: 'loading', error: '', refreshError: '' }))
    const { data, error } = await fetchAdminOrder(orderId)
    if (error) {
      setState((current) => quiet && current.status === 'ready'
        ? { ...current, refreshError: error }
        : { status: 'error', order: null, error, refreshError: '' })
      return
    }
    if (!data) {
      setState((current) => quiet && current.status === 'ready'
        ? { ...current, refreshError: 'Order not found.' }
        : { status: 'error', order: null, error: 'Order not found.', refreshError: '' })
      return
    }
    setState({ status: 'ready', order: data, error: '', refreshError: '' })
    const canRetryDelivery = data.status === 'out_for_delivery'
      && data.delivery_confirmations?.[0]?.response === false
    setNextStatus(data.status === 'out_for_delivery'
      ? (canRetryDelivery ? 'shipped' : '')
      : transitions[data.status]?.[0] ?? '')
  }, [orderId])
  useEffect(() => {
    void load()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    const interval = window.setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [load])

  async function updateStatus() {
    if (!nextStatus) return
    setSaving(true)
    setMessage('')
    const { error } = await updateAdminOrderStatus(orderId, nextStatus)
    setSaving(false)
    if (error) { setMessage(error); return }
    setMessage(`Order status updated to ${nextStatus}. Payment status was not changed.`)
    await load()
  }

  if (state.status === 'loading') return <p className="py-8 text-sm text-muted" role="status">Loading order…</p>
  if (state.status === 'error') return <div role="alert"><p>{state.error}</p><Button className="mt-4" variant="outline" onClick={load}>Try again</Button></div>
  const order = state.order
  const lastDeliveryConfirmation = order.delivery_confirmations?.[0]
  const availableTransitions = order.status === 'out_for_delivery' && lastDeliveryConfirmation?.response !== false
    ? []
    : transitions[order.status] ?? []

  return (
    <div>
      <Link to="/admin/orders" className="eyebrow underline underline-offset-4">← All orders</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow text-muted">Order detail</p><h2 className="mt-2 text-4xl">{order.reference}</h2></div>
        <Button variant="outline" onClick={() => load()}>Refresh order</Button>
      </div>
      <p className="mt-2 text-sm text-muted">{date(order.created_at)}</p>
      {message && <p className="mt-5 rounded-xl border border-line bg-white p-4 text-sm" role="status">{message}</p>}
      {state.refreshError && <p className="mt-4 text-sm text-red-800" role="alert">{state.refreshError} Showing the last loaded order.</p>}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="text-2xl">Fulfilment</h3>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="text-muted">Customer</dt><dd>{order.customer_name}</dd>
            <dt className="text-muted">Email</dt><dd className="break-all">{order.customer_email ?? 'Email unavailable'}</dd>
            <dt className="text-muted">Phone</dt><dd>{order.phone}</dd>
            <dt className="text-muted">Address</dt><dd>{order.street}{order.landmark ? `, ${order.landmark}` : ''}, {order.city}, {order.state} {order.pin_code}</dd>
            <dt className="text-muted">Order status</dt><dd>{getOrderStatusLabel(order.status)}</dd>
            <dt className="text-muted">Payment</dt><dd>{paymentMethodLabel(order)} · {paymentStatusLabel(order)}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted">Payment status is read-only. No real payment is processed; COD is due on delivery.</p>
          {order.demo_transaction && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
              <dt className="text-muted">Transaction reference</dt><dd className="break-all">{order.demo_transaction.transaction_reference}</dd>
              <dt className="text-muted">Session reference</dt><dd>{order.demo_transaction.session_reference}</dd>
              <dt className="text-muted">Amount</dt><dd>{formatPrice(order.demo_transaction.amount_inr)}</dd>
              <dt className="text-muted">Recorded</dt><dd>{demoTransactionTimestamp(order.demo_transaction.transaction_at)}</dd>
              <dt className="text-muted">Verification</dt><dd>Not a bank-confirmed payment</dd>
            </dl>
          )}
          {availableTransitions.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="next-status">Next order status</label>
              <select id="next-status" className="rounded-full border border-line px-4 py-3 text-sm capitalize" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                {availableTransitions.map((status) => <option key={status} value={status}>{statusOptionLabels[status]}</option>)}
              </select>
              <Button disabled={saving || !nextStatus} onClick={updateStatus}>{saving ? 'Saving…' : 'Update status'}</Button>
            </div>
          )}
          {order.status === 'out_for_delivery' && (
            <p className="mt-3 text-xs text-muted">Only the customer can mark this order Delivered. Returning it to Shipped is permitted only after the customer reports non-receipt.</p>
          )}
          {order.delivered_at && <p className="mt-3 text-xs text-muted">Customer-confirmed receipt: {date(order.delivered_at)}</p>}
        </section>
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="text-2xl">Items and total</h3>
          <ul className="mt-4 divide-y divide-line text-sm">{order.items.map((item, index) => <li key={`${item.product_name}-${index}`} className="flex justify-between gap-4 py-3">
            <div><p className="font-semibold">{item.product_name}</p><p className="text-muted">{item.color_label} · UK {item.size} · Qty {item.quantity}</p></div>
            <p className="shrink-0">{formatPrice(item.line_total_inr)}</p>
          </li>)}</ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal_inr)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(order.delivery_fee_inr)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(order.total_inr)}</dd></div>
          </dl>
        </section>
      </div>
      <section aria-labelledby="delivery-confirmation-history-heading" className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h3 id="delivery-confirmation-history-heading" className="text-2xl">Delivery confirmation history</h3>
        {order.delivery_confirmations?.length ? (
          <ol className="mt-4 divide-y divide-line">
            {order.delivery_confirmations.map((confirmation) => (
              <li key={confirmation.attempt} className="py-4 first:pt-0 last:pb-0">
                <p className="font-semibold">Attempt {confirmation.attempt} · Notification created {date(confirmation.created_at)}</p>
                <p className="mt-1 text-sm text-muted">
                  {confirmation.response === null
                    ? 'Awaiting customer confirmation'
                    : `${confirmation.response ? 'Customer confirmed receipt' : 'Customer reported non-receipt'}${confirmation.responded_at ? ` · ${date(confirmation.responded_at)}` : ''}`}
                </p>
                {confirmation.issue_report && (
                  <div className="mt-3 rounded-xl border border-line bg-canvas p-4 text-sm">
                    <p className="font-semibold">Customer delivery problem report</p>
                    <p className="mt-1 whitespace-pre-wrap">{confirmation.issue_report}</p>
                    {confirmation.issue_reported_at && <p className="mt-2 text-xs text-muted">Recorded {date(confirmation.issue_reported_at)}</p>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">No delivery confirmation notification has been created yet.</p>
        )}
      </section>
    </div>
  )
}
