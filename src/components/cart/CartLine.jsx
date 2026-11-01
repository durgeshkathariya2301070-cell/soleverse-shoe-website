import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import SmartImage from '../SmartImage.jsx'
import QuantityStepper from './QuantityStepper.jsx'
import { formatPrice } from '../../utils/formatPrice.js'

// One row in the bag: photo, name, colour, size, price, quantity, remove.
export default function CartLine({ line, onQuantityChange, onRemove }) {
  const label = `${line.name}, ${line.colorLabel}, UK ${line.size}`
  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      <Link
        to={`/product/${line.slug}`}
        className="block h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface sm:h-36 sm:w-32"
        aria-label={`View ${line.name}`}
      >
        <SmartImage image={line.image} sizes="128px" className="object-cover" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl leading-none">
              <Link to={`/product/${line.slug}`} className="hover:underline hover:underline-offset-4">
                {line.name}
              </Link>
            </h3>
            <dl className="mt-2 space-y-0.5 text-sm text-muted">
              <div className="flex items-center gap-2">
                <dt className="sr-only">Colour</dt>
                <dd className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border border-ink/20" style={{ backgroundColor: line.colorHex }} />
                  {line.colorLabel}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt>Size:</dt>
                <dd className="font-medium text-ink">UK {line.size}</dd>
              </div>
            </dl>
          </div>
          <p className="shrink-0 text-right text-base font-semibold">{formatPrice(line.lineTotal)}</p>
        </div>

        {line.status === 'sold_out' && (
          <p className="mt-2 text-sm font-medium text-red-700">This size is sold out. Remove it to continue.</p>
        )}
        {line.status === 'low_stock' && (
          <p className="mt-2 text-sm font-medium text-red-700">Only {line.stock} left in sample stock. Lower the quantity.</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <QuantityStepper quantity={line.quantity} onChange={(next) => onQuantityChange(line.key, next)} label={label} />
          <p className="text-xs text-muted">{formatPrice(line.unitPrice)} each</p>
          <button
            type="button"
            onClick={() => onRemove(line.key)}
            aria-label={`Remove ${label} from bag`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted underline underline-offset-[6px] hover:text-ink"
          >
            <Trash2 size={14} aria-hidden="true" /> Remove
          </button>
        </div>
      </div>
    </li>
  )
}
