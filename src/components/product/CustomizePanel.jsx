import { Check } from 'lucide-react'
import { customColorPalette } from '../../data/customColors.js'
import { cn } from '../../utils/cn.js'

// "Customise preview": one colour row per part that the loaded model REALLY supports.
// The parent decides which parts are passed in, so unsupported parts never appear.
//   parts: [{ id, label }]    colors: { partId: '#hex' }    onChange(partId, hexOrNull)    onReset()
export default function CustomizePanel({ parts, colors, onChange, onReset }) {
  const hasChanges = Object.keys(colors).length > 0

  return (
    <section aria-labelledby="customise-heading" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 id="customise-heading" className="text-2xl">
          Customise preview
        </h2>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasChanges}
          className="text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-[6px] hover:decoration-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
        >
          Reset colours
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        A visual preview only. These colours do not change the product you buy and do not create a custom order.
      </p>

      <div className="mt-5 space-y-5">
        {parts.map((part) => {
          const chosen = customColorPalette.find((color) => color.hex === colors[part.id])
          return (
            <div key={part.id}>
              <p id={`custom-${part.id}`} className="eyebrow text-muted">
                {part.label}: <span className="text-ink">{chosen ? chosen.label : 'Original'}</span>
              </p>
              <div role="radiogroup" aria-labelledby={`custom-${part.id}`} className="mt-2 flex flex-wrap gap-2">
                {customColorPalette.map((color) => {
                  const isSelected = colors[part.id] === color.hex
                  return (
                    <button
                      key={color.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${part.label} ${color.label}`}
                      title={color.label}
                      onClick={() => onChange(part.id, color.hex)}
                      className={cn(
                        'relative inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                        isSelected ? 'border-ink ring-2 ring-lime ring-offset-2 ring-offset-surface' : 'border-line hover:border-ink/50',
                      )}
                    >
                      <span aria-hidden="true" className="h-5 w-5 rounded-full border border-ink/15" style={{ backgroundColor: color.hex }} />
                      {isSelected && (
                        <Check
                          size={12}
                          aria-hidden="true"
                          className="absolute"
                          style={{ color: color.id === 'black' || color.id === 'blue' ? '#fff' : '#171717' }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
