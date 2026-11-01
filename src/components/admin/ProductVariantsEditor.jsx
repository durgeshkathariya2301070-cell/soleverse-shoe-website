import { Plus, Trash2 } from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm'
const emptyVariant = () => ({
  color_id: '',
  color_label: '',
  color_hex: '#171717',
  size: '',
  stock: '0',
  persisted: false,
})

export default function ProductVariantsEditor({ variants, onChange, fieldErrors = {} }) {
  function updateVariant(index, patch) {
    onChange(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...patch } : variant))
  }

  return (
    <section className="sm:col-span-2 rounded-xl border border-line p-4" aria-labelledby="product-variants-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 id="product-variants-title" className="text-lg font-semibold">Product Variants</h4>
          <p className="mt-1 text-xs text-muted">The database keys each variant by colour ID and UK size. SKU and per-variant prices are not part of the current schema.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold" onClick={() => onChange([...variants, emptyVariant()])}>
          <Plus size={15} aria-hidden="true" /> Add variant
        </button>
      </div>
      {variants.length === 0 && <p className="mt-4 rounded-lg bg-canvas p-4 text-sm text-muted">No variants added. A product must have at least one valid size and colour before publishing.</p>}
      <div className="mt-4 space-y-3">
        {variants.map((variant, index) => (
          <div key={`variant-${index}`} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm">Colour ID
              <input className={inputClass} readOnly={variant.persisted} value={variant.color_id} onChange={(event) => updateVariant(index, { color_id: event.target.value.toLowerCase() })} placeholder="core-black" />
              {fieldErrors[`variants.${index}.color_id`] && <small className="text-red-700">{fieldErrors[`variants.${index}.color_id`]}</small>}
            </label>
            <label className="text-sm">Colour name
              <input className={inputClass} value={variant.color_label} onChange={(event) => updateVariant(index, { color_label: event.target.value })} placeholder="Core Black" />
              {fieldErrors[`variants.${index}.color_label`] && <small className="text-red-700">{fieldErrors[`variants.${index}.color_label`]}</small>}
            </label>
            <label className="text-sm">Swatch colour
              <input className={inputClass} type="color" value={variant.color_hex || '#171717'} onChange={(event) => updateVariant(index, { color_hex: event.target.value })} />
              {fieldErrors[`variants.${index}.color_hex`] && <small className="text-red-700">{fieldErrors[`variants.${index}.color_hex`]}</small>}
            </label>
            <label className="text-sm">UK size
              <input className={inputClass} type="number" min="1" max="20" step="1" readOnly={variant.persisted} value={variant.size} onChange={(event) => updateVariant(index, { size: event.target.value })} />
              {fieldErrors[`variants.${index}.size`] && <small className="text-red-700">{fieldErrors[`variants.${index}.size`]}</small>}
            </label>
            <label className="text-sm">Stock quantity
              <input className={inputClass} type="number" min="0" max="100000" step="1" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} />
              {fieldErrors[`variants.${index}.stock`] && <small className="text-red-700">{fieldErrors[`variants.${index}.stock`]}</small>}
            </label>
            {variant.persisted ? (
              <p className="text-xs text-muted sm:col-span-2 xl:col-span-5">Existing inventory rows are retained for cart/order references. Set stock to 0 to make this size unavailable.</p>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 justify-self-start rounded border border-red-200 px-2 py-1.5 text-xs text-red-700 sm:col-span-2 xl:col-span-5" onClick={() => onChange(variants.filter((_, variantIndex) => variantIndex !== index))}>
                <Trash2 size={13} aria-hidden="true" /> Remove variant
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
