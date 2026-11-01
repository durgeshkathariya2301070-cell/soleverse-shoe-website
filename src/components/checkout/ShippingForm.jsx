import TextField from '../auth/TextField.jsx'
import { INDIAN_STATES } from '../../data/indianStates.js'
import { LIMITS } from '../../utils/checkoutValidation.js'
import { cn } from '../../utils/cn.js'

// The order the fields appear in, also used to focus the first field with a problem.
export const SHIPPING_FIELD_ORDER = ['fullName', 'phone', 'pinCode', 'state', 'city', 'street', 'landmark']
export const shippingFieldId = (field) => `checkout-${field}`

// The delivery address part of the checkout form. It only displays and reports changes;
// the page owns the values and the checks.
export default function ShippingForm({ values, errors, onChange, disabled }) {
  const bind = (field) => ({
    id: shippingFieldId(field),
    value: values[field],
    error: errors[field],
    disabled,
    onChange: (event) => onChange(field, event.target.value),
  })

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-2xl">Delivery details</legend>
      <p className="mt-2 text-sm text-muted">Where should we send your order? Fields marked optional can stay empty.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <TextField {...bind('fullName')} label="Full name" autoComplete="name" maxLength={LIMITS.name[1] + 20} className="sm:col-span-2" />
        <TextField {...bind('phone')} label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" hint="10 digits, for the delivery partner." />
        <TextField {...bind('pinCode')} label="PIN code" inputMode="numeric" autoComplete="postal-code" maxLength={6} hint="6 digits." />

        <div>
          <label htmlFor={shippingFieldId('state')} className="eyebrow mb-2 block text-ink">
            State
          </label>
          <select
            id={shippingFieldId('state')}
            value={values.state}
            disabled={disabled}
            autoComplete="address-level1"
            aria-invalid={errors.state ? 'true' : undefined}
            aria-describedby={errors.state ? 'checkout-state-error' : undefined}
            onChange={(event) => onChange('state', event.target.value)}
            className={cn(
              'h-12 w-full rounded-xl border bg-surface px-4 text-base text-ink disabled:cursor-not-allowed disabled:opacity-60',
              errors.state ? 'border-red-600' : 'border-line hover:border-ink/40 focus:border-ink',
            )}
          >
            <option value="">Choose a state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {errors.state && (
            <p id="checkout-state-error" className="mt-2 text-sm font-medium text-red-700">
              {errors.state}
            </p>
          )}
        </div>
        <TextField {...bind('city')} label="City / town" autoComplete="address-level2" />

        <TextField {...bind('street')} label="Street address" autoComplete="street-address" hint="House or flat number, building, street, area." className="sm:col-span-2" />
        <TextField {...bind('landmark')} label="Landmark (optional)" hint="For example: near the post office." className="sm:col-span-2" />
      </div>
    </fieldset>
  )
}
