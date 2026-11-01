import { useMemo, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { searchInventoryProducts } from '../../utils/adminInventory.js'

const inputClass = 'w-full rounded-lg border border-line bg-white px-2.5 py-2 pr-9 text-sm'

export default function InventoryProductAutocomplete({ products, value, error, onSelect, onClear }) {
  const selectedProduct = products.find((product) => product.id === value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo(
    () => searchInventoryProducts(products, selectedProduct ? `${selectedProduct.name} ${selectedProduct.id}` : query),
    [products, query, selectedProduct],
  )
  const activeProduct = results[activeIndex]
  const showResults = open && results.length > 0

  function choose(product) {
    onSelect(product)
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open && activeProduct) {
      event.preventDefault()
      choose(activeProduct)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative text-sm">
      <label htmlFor="inventory-product-search" className="block">
        Product
      </label>
      <div className="relative mt-1">
        <input
          id="inventory-product-search"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls="inventory-product-options"
          aria-activedescendant={showResults && activeProduct ? `inventory-product-option-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'inventory-product-error' : 'inventory-product-help'}
          autoComplete="off"
          className={inputClass}
          value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.id})` : query}
          placeholder="Search name, brand, or product ID"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
            if (value) onClear()
          }}
        />
        {selectedProduct ? (
          <button
            type="button"
            aria-label="Clear selected product"
            className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-muted hover:text-ink"
            onClick={() => {
              onClear()
              setQuery('')
              setOpen(true)
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        )}
      </div>
      <p id="inventory-product-help" className="mt-1 text-xs text-muted">
        Search by product name, brand, ID, or category. Unpublished products are included.
      </p>
      {error && <small id="inventory-product-error" className="text-red-700">{error}</small>}

      {showResults && (
        <ul
          id="inventory-product-options"
          role="listbox"
          aria-label="Matching products"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-lg"
        >
          {results.map((product, index) => (
            <li
              key={product.id}
              id={`inventory-product-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex cursor-pointer items-center gap-3 rounded-md p-2 ${index === activeIndex ? 'bg-canvas' : 'hover:bg-canvas'}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(product)}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-md border border-line object-cover"
                  onError={(event) => { event.currentTarget.hidden = true }}
                />
              ) : (
                <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-md border border-line bg-canvas" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{product.name}</span>
                  {value === product.id && <Check size={14} aria-hidden="true" />}
                </span>
                <span className="block truncate text-xs text-muted">
                  {[product.brand, product.id, product.category, product.is_active ? 'Active' : 'Unpublished']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && !results.length && (
        <p className="mt-2 text-xs text-muted" role="status">No products match “{query}”. Try a different name, brand, or ID.</p>
      )}
    </div>
  )
}
