import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { PAYMENT_METHODS } from '../../data/checkoutConfig.js'
import { cn } from '../../utils/cn.js'
import { SIMULATED_PAYMENT_NOTICE } from '../../utils/demoPayment.js'

const icons = { cod: Banknote, demo_upi: Smartphone, demo_card: CreditCard }

// Choose how to pay. NO real payment exists in this project: online options use mock inputs only.
export default function PaymentOptions({ value, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-2xl">Payment</legend>
      <div className="mt-5 space-y-3">
        {PAYMENT_METHODS.map((method) => {
          const Icon = icons[method.id]
          const selected = value === method.id
          return (
            <label
              key={method.id}
              className={cn(
                'flex cursor-pointer items-start gap-4 rounded-xl border bg-surface p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                selected ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-ink/40',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={selected}
                onChange={() => onChange(method.id)}
                className="mt-1 h-4 w-4 accent-ink"
              />
              <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {method.label}
                  {method.simulated && <span className="eyebrow rounded-full bg-ink px-2 py-0.5 text-lime">No real charge</span>}
                </span>
                <span className="mt-1 block text-sm text-muted">{method.description}</span>
              </span>
            </label>
          )
        })}
      </div>

      {value !== 'cod' && (
        <p role="note" className="mt-4 rounded-xl border border-dashed border-ink/40 bg-lime/30 px-4 py-3 text-sm">
          <strong>{SIMULATED_PAYMENT_NOTICE}</strong> No financial service is contacted, and
          real card numbers, CVVs, UPI PINs, or banking passwords are never requested, stored, or sent.
        </p>
      )}
    </fieldset>
  )
}
