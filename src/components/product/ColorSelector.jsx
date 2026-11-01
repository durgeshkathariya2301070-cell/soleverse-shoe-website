import { Check } from 'lucide-react'
import { cn } from '../../utils/cn.js'

// Colour swatches. Each swatch has a visible label on selection and an accessible name.
//   colors: [{ id, label, hex }]
//   unavailableIds: colour ids that have no size in sample stock (still selectable, marked sold out)
export default function ColorSelector({ colors, selectedId, onSelect, unavailableIds = [] }) {
  const selected = colors.find((color) => color.id === selectedId)

  return (
    <div>
      <p id="color-label" className="eyebrow text-muted">
        Colour: <span className="text-ink">{selected?.label}</span>
      </p>

      <div role="radiogroup" aria-labelledby="color-label" className="mt-3 flex flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = color.id === selectedId
          const soldOut = unavailableIds.includes(color.id)
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${color.label}${soldOut ? ', sold out in sample data' : ''}`}
              title={`${color.label}${soldOut ? ' (sold out)' : ''}`}
              onClick={() => onSelect(color.id)}
              className={cn(
                'relative inline-flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all',
                isSelected ? 'border-ink ring-2 ring-lime ring-offset-2 ring-offset-canvas' : 'border-line hover:border-ink/50',
              )}
            >
              <span
                aria-hidden="true"
                className="h-7 w-7 rounded-full border border-ink/15"
                style={{ backgroundColor: color.hex }}
              />
              {isSelected && (
                <Check
                  size={14}
                  aria-hidden="true"
                  className="absolute"
                  style={{ color: color.id === 'black' || color.id === 'blue' ? '#fff' : '#171717' }}
                />
              )}
              {soldOut && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink/60"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
