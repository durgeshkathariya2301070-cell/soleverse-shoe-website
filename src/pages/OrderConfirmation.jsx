import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import Button from '../components/Button.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import OrderSummary from '../components/cart/OrderSummary.jsx'
import NotFound from './NotFound.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { fetchOrderByReference } from '../services/orderService.js'
import { formatPrice } from '../utils/formatPrice.js'
import { demoTransactionTimestamp, paymentMethodLabel, paymentStatusLabel } from '../utils/paymentDisplay.js'

export const ORDER_REFERENCE_PATTERN = /^SV-[A-Z0-9]{8}$/

// Shown right after an order is placed. The details are read back from the database
// (only the customer who placed the order can read them), so this is the saved order, not a guess.
export default function OrderConfirmation() {
  const { reference } = useParams()
  if (!ORDER_REFERENCE_PATTERN.test(reference ?? '')) return <NotFound />
  return <ConfirmationView reference={reference} />
}

function ConfirmationView({ reference }) {
  const [state, setState] = useState({ status: 'loading', order: null, error: null }) // 'loading' | 'ready' | 'missing' | 'error'
  const [reloadCount, setReloadCount] = useState(0)
  usePageTitle(state.status === 'ready' ? 'Order confirmed' : 'Order status')

  useEffect(() => {
    let active = true
    setState({ status: 'loading', order: null, error: null })
    fetchOrderByReference(reference).then(({ data, error }) => {
      if (!active) return
      if (error) setState({ status: 'error', order: null, error })
      else if (!data) setState({ status: 'missing', order: null, error: null })
      else setState({ status: 'ready', order: data, error: null })
    })
    return () => {
      active = false
    }
  }, [reference, reloadCount])

  const { order } = state
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        {state.status === 'ready' && (
          <>
            <CircleCheck size={40} strokeWidth={1.5} aria-hidden="true" />
            <p className="eyebrow mt-6 text-muted">Order placed</p>
            <h1 className="mt-3 text-5xl sm:text-6xl">Thank you</h1>
            <p className="mt-5 text-muted">Your order reference is:</p>
            <p className="mt-1 text-3xl font-bold tracking-wider" data-testid="order-reference">{reference}</p>
            <p className="mt-2 text-sm text-muted">Keep this reference if you need to ask about your order.</p>
          </>
        )}

        {state.status === 'loading' && <p className="mt-10 text-sm text-muted" role="status">Checking that your order was saved…</p>}

        {(state.status === 'error' || state.status === 'missing') && (
          <FormMessage tone={state.status === 'error' ? 'error' : 'info'} className="mt-10">
            {state.status === 'missing'
              ? "We couldn't confirm an order for this reference on your account. Make sure you are logged in with the account that placed the order, then check again."
              : state.error.message}{' '}
            <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="font-semibold underline underline-offset-4">Try again</button>
          </FormMessage>
        )}

        {state.status === 'ready' && (
          <div className="mt-10 grid gap-8 md:grid-cols-5">
            <div className="space-y-8 md:col-span-3">
              <section aria-labelledby="items-title">
                <h2 id="items-title" className="text-2xl">Items</h2>
                <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4 py-3">
                      <div>
                        <p className="font-semibold">{item.product_name}</p>
                        <p className="text-muted">{item.color_label} · UK {item.size} · Qty {item.quantity}</p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatPrice(item.line_total_inr)}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="delivery-title">
                <h2 id="delivery-title" className="text-2xl">Delivering to</h2>
                <address className="mt-4 text-sm not-italic leading-relaxed">
                  <strong>{order.ship_full_name}</strong>
                  <br />
                  {order.ship_street}
                  {order.ship_landmark && (<><br />Landmark: {order.ship_landmark}</>)}
                  <br />
                  {order.ship_city}, {order.ship_state} {order.ship_pin_code}
                  <br />
                  Phone: {order.ship_phone}
                </address>
              </section>
            </div>

            <div className="space-y-4 md:col-span-2">
              <OrderSummary subtotal={order.subtotal_inr} deliveryFee={order.delivery_fee_inr} total={order.total_inr} title="Totals" />
              <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
                <p className="eyebrow text-muted">Payment</p>
                <p className="mt-2"><strong>{paymentMethodLabel(order)}</strong></p>
                <p className="mt-1 text-muted">{paymentStatusLabel(order)}</p>
                {order.payment_method === 'cod' && (
                  <p className="mt-2">Pay {formatPrice(order.total_inr)} in cash when your order arrives.</p>
                )}
                {order.payment_method === 'simulated_online' && (
                  <>
                    <p className="mt-2 font-semibold">PAYMENT NOTICE — No real money was charged.</p>
                    <p className="mt-1 text-xs text-muted">Not a bank-confirmed payment.</p>
                  </>
                )}
              </div>
              {order.demo_transaction && (
                <section aria-label="Transaction details" className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
                  <h2 className="text-xl font-semibold">Payment details</h2>
                  <p className="mt-2 text-xs text-muted">Not a bank-confirmed payment.</p>
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                    <dt className="text-muted">Order reference</dt><dd>{order.reference}</dd>
                    <dt className="text-muted">Session reference</dt><dd>{order.demo_transaction.session_reference}</dd>
                    <dt className="text-muted">Transaction reference</dt><dd className="break-all">{order.demo_transaction.transaction_reference}</dd>
                    <dt className="text-muted">Amount</dt><dd>{formatPrice(order.demo_transaction.amount_inr)}</dd>
                    <dt className="text-muted">Method</dt><dd>{paymentMethodLabel(order)}</dd>
                    <dt className="text-muted">Result</dt><dd>No money received</dd>
                    <dt className="text-muted">Timestamp</dt><dd>{demoTransactionTimestamp(order.demo_transaction.transaction_at)}</dd>
                  </dl>
                </section>
              )}
            </div>
          </div>
        )}

        <p className="mt-10 rounded-xl border border-dashed border-ink/30 bg-surface px-4 py-3 text-sm text-muted">
          SOLEVERSE is a store preview with sample products. No real shoes will be shipped and no real payment is taken.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/shop">Continue shopping</Button>
          <Button to="/account" variant="outline">My account</Button>
        </div>
        <p className="mt-6 text-xs text-muted"><Link to="/" className="underline underline-offset-4">Back to home</Link></p>
      </div>
    </div>
  )
}
