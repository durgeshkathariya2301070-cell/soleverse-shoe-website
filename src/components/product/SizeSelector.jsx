import { cn } from '../../utils/cn.js'

// Size buttons (UK / India). Sizes with no sample stock for the chosen colour are disabled and struck through.
//   sizes: [6, 7, 8 ...]   isSizeAvailable: (size) => true/false
export default function SizeSelector({ sizes, selectedSize, onSelect, isSizeAvailable, children }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p id="size-label" className="eyebrow text-muted">
          Size (UK / India): <span className="text-ink">{selectedSize ?? 'Select a size'}</span>
        </p>
        {children /* the size guide button */}
      </div>

      <div role="radiogroup" aria-labelledby="size-label" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {sizes.map((size) => {
          const available = isSizeAvailable(size)
          const isSelected = size === selectedSize
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!available}
              aria-label={`UK ${size}${available ? '' : ', sold out in sample data'}`}
              onClick={() => onSelect(size)}
              className={cn(
                'rounded-lg border py-3 text-sm font-semibold transition-colors',
                isSelected && 'border-ink bg-lime text-ink',
                !isSelected && available && 'border-line bg-surface hover:border-ink',
                !available && 'cursor-not-allowed border-line bg-transparent text-muted/60 line-through',
              )}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}
