import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import ProductCard from '../components/ProductCard.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Button from '../components/Button.jsx'
import { useCatalogue } from '../context/CatalogueContext.jsx'
import { getCategoryById } from '../data/categories.js'
import {
  SORT_OPTIONS,
  DEFAULT_SORT,
  getCatalogueFilterOptions,
  getCategoryOptions,
  getVisibleProducts,
  normalizeSort,
  resolveCategorySelection,
} from '../utils/catalogue.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { cn } from '../utils/cn.js'

// The three controls (search, category, sort) are stored in the URL:
//   /shop?q=aero&category=running&sort=price-asc
// so they work together, the back button works, and a filtered page can be shared.
// Changing one control keeps the other two.
export default function Shop() {
  const { products, status, error } = useCatalogue()
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const requestedCategory = searchParams.get('category')
  const categorySelection = resolveCategorySelection(requestedCategory)
  const selectedCategory = getCategoryById(categorySelection.category)
  const brand = searchParams.get('brand') ?? ''
  const sport = categorySelection.sport || searchParams.get('sport') || ''
  const style = searchParams.get('style') ?? ''
  const sort = normalizeSort(searchParams.get('sort'))

  const categoryOptions = getCategoryOptions(products)
  const filterOptions = getCatalogueFilterOptions(products)
  const visibleProducts = getVisibleProducts(products, {
    query,
    category: categorySelection.category,
    brand,
    sport,
    style,
    sort,
  })

  const hasActiveFilters = query.trim() !== '' || selectedCategory !== null || brand !== '' || sport !== '' || style !== '' || sort !== DEFAULT_SORT
  usePageTitle(selectedCategory ? `${selectedCategory.label} sneakers` : 'Shop')

  // Update some URL values and keep the rest. An empty value removes that key.
  // Typing in the search box uses `replace` so every keystroke does not add a history entry.
  function updateParams(changes, { replace = false } = {}) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if ('sport' in changes && categorySelection.sport) next.set('category', 'sports')
    setSearchParams(next, { replace })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
  }

  const chipClass = (active) =>
    cn(
      'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors',
      active ? 'border-ink bg-lime text-ink' : 'border-line bg-surface text-muted hover:border-ink hover:text-ink',
    )

  return (
    <div className="container-page py-12 md:py-20">
      <SectionHeading
        as="h1"
        eyebrow={status === 'database' ? 'Shop · SOLEVERSE' : 'Shop · SOLEVERSE collection'}
        title={selectedCategory ? selectedCategory.label : 'All sneakers'}
        description={status === 'database'
          ? 'Search, filter and sort the live SOLEVERSE catalogue.'
          : 'Search, filter and sort the SOLEVERSE collection.'}
      />
      {status === 'loading' && (
        <p className="mt-6 text-sm text-muted" role="status">Loading the catalogue…</p>
      )}
      {error && <p className="mt-4 text-sm text-amber-800" role="status">{error} The catalogue shown may be out of date.</p>}
      {/* Controls */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,auto)] lg:items-center">
        <div className="relative">
          <label htmlFor="shop-search" className="sr-only">
            Search sneakers by name, product ID, category, brand, or style
          </label>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="shop-search"
            type="search"
            value={query}
            onChange={(event) => updateParams({ q: event.target.value }, { replace: true })}
            placeholder="Search by name, ID, category, brand or style"
            autoComplete="off"
            className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-4 text-sm placeholder:text-muted focus:border-ink"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="shop-sort" className="eyebrow shrink-0 text-muted">
            Sort
          </label>
          <select
            id="shop-sort"
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value === DEFAULT_SORT ? '' : event.target.value })}
            className="w-full min-w-0 rounded-full border border-line bg-surface px-4 py-3 text-sm md:w-auto"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Brand
          <select
            aria-label="Filter by brand"
            value={brand}
            onChange={(event) => updateParams({ brand: event.target.value })}
            className="min-w-0 rounded-full border border-line bg-surface px-4 py-3 text-sm font-normal normal-case tracking-normal text-ink"
          >
            <option value="">All brands</option>
            {filterOptions.brands.map((option) => (
              <option key={option.id} value={option.id}>{option.label}{option.count === 0 && status === 'database' ? ' (0)' : ''}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Sport
          <select
            aria-label="Filter by sport"
            value={sport}
            onChange={(event) => updateParams({ sport: event.target.value })}
            className="min-w-0 rounded-full border border-line bg-surface px-4 py-3 text-sm font-normal normal-case tracking-normal text-ink"
          >
            <option value="">All sports</option>
            {filterOptions.sports.map((option) => (
              <option key={option.id} value={option.id}>{option.label}{option.count === 0 && status === 'database' ? ' (0)' : ''}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Style
          <select
            aria-label="Filter by style"
            value={style}
            onChange={(event) => updateParams({ style: event.target.value })}
            className="min-w-0 rounded-full border border-line bg-surface px-4 py-3 text-sm font-normal normal-case tracking-normal text-ink"
          >
            <option value="">All styles</option>
            {filterOptions.styles.map((option) => (
              <option key={option.id} value={option.id}>{option.label}{option.count === 0 && status === 'database' ? ' (0)' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Category filter built from the product data */}
      <div role="group" aria-label="Filter by category" className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateParams({ category: '' })}
          aria-pressed={!selectedCategory}
          className={chipClass(!selectedCategory)}
        >
          All
        </button>
        {categoryOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => updateParams({ category: option.id })}
            aria-pressed={selectedCategory?.id === option.id}
            className={chipClass(selectedCategory?.id === option.id)}
          >
            {option.label}{option.count === 0 && status === 'database' ? ' (0)' : ''}
          </button>
        ))}
      </div>

      {/* Result count + clear */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          Showing {visibleProducts.length} of {products.length} {products.length === 1 ? 'product' : 'products'}
          {selectedCategory ? ` in ${selectedCategory.label}` : ''}
          {query.trim() ? ` matching “${query.trim()}”` : ''}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-[6px] hover:decoration-2"
          >
            <X size={14} aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>

      {status === 'loading' ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
          ))}
        </div>
      ) : visibleProducts.length > 0 ? (
        <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-16 text-center">
          <h2 className="text-3xl">No sneakers found</h2>
          <p className="mx-auto mt-3 max-w-sm text-muted">
            Nothing in the catalogue matches your search and filters. Try a different word or clear the filters.
          </p>
          <div className="mt-6">
            <Button variant="dark" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
