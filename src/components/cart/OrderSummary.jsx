import { formatPrice } from '../../utils/formatPrice.js'

// Subtotal, delivery and total. The same box is used on the bag page and at checkout.
export default function OrderSummary({ subtotal, deliveryFee, total, itemCount, title = 'Order summary', note, children }) {
  return (
    <section aria-labelledby="order-summary-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <h2 id="order-summary-title" className="text-2xl">
        {title}
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Subtotal{typeof itemCount === 'number' ? ` (${itemCount} ${itemCount === 1 ? 'pair' : 'pairs'})` : ''}</dt>
          <dd className="font-semibold" data-testid="summary-subtotal">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Delivery (flat rate)</dt>
          <dd className="font-semibold" data-testid="summary-delivery">{formatPrice(deliveryFee)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-4 text-base">
          <dt className="font-semibold">Total</dt>
          <dd className="text-xl font-bold" data-testid="summary-total">{formatPrice(total)}</dd>
        </div>
      </dl>
      {note && <p className="mt-4 text-xs text-muted">{note}</p>}
      {children}
    </section>
  )
}
