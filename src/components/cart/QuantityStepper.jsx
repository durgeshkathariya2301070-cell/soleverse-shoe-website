import { Minus, Plus } from 'lucide-react'
import { MAX_QUANTITY_PER_LINE } from '../../data/checkoutConfig.js'

// − 2 + control. `label` names the item for screen readers ("Aero Runner 01, UK 8").
export default function QuantityStepper({ quantity, onChange, label, max = MAX_QUANTITY_PER_LINE }) {
  const button =
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <div role="group" aria-label={`Quantity for ${label}`} className="inline-flex items-center rounded-full border border-line bg-surface">
      <button type="button" className={button} onClick={() => onChange(quantity - 1)} disabled={quantity <= 1} aria-label={`Decrease quantity of ${label}`}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite" aria-label={`${quantity} in bag`}>
        {quantity}
      </span>
      <button type="button" className={button} onClick={() => onChange(quantity + 1)} disabled={quantity >= max} aria-label={`Increase quantity of ${label}`}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
