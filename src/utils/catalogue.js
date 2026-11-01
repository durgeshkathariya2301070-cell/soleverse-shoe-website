// Pure helper functions for the Shop page: filtering, sorting and category options.
// "Pure" means: they only use what is passed in and never change the original arrays.
// That makes them easy to test (see catalogue.test.js).

import { categories, getCategoryLabel } from '../data/categories.js'

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'brand-asc', label: 'Brand: A to Z' },
  { value: 'brand-desc', label: 'Brand: Z to A' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

export const DEFAULT_SORT = 'featured'
export const SPORT_OPTIONS = [
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'basketball', label: 'Basketball' },
]
export const STYLE_OPTIONS = ['Low Dunk', 'Low Top']

const SPORT_CATEGORY_ALIASES = new Set(SPORT_OPTIONS.map((sport) => sport.id))

export function resolveCategorySelection(requestedCategory) {
  if (SPORT_CATEGORY_ALIASES.has(requestedCategory)) {
    return { category: 'sports', sport: requestedCategory }
  }
  return {
    category: categories.some((category) => category.id === requestedCategory) ? requestedCategory : '',
    sport: '',
  }
}

// Accepts only known sort values; anything else (for example a hand-edited URL) becomes the default.
export function normalizeSort(value) {
  return SORT_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_SORT
}

// Category options come from the products themselves, in the order they first appear.
// Returns [{ id, label, count }].
export function getCategoryOptions(products) {
  return categories.map((category) => ({
    id: category.id,
    label: getCategoryLabel(category.id),
    count: products.filter((product) => product.category === category.id).length,
  }))
}

export function getCatalogueFilterOptions(products) {
  const brands = [...new Set(products.map((product) => product.brand?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
  return {
    brands: brands.map((label) => ({
      id: label.toLowerCase(),
      label,
      count: products.filter((product) => product.brand?.toLowerCase() === label.toLowerCase()).length,
    })),
    sports: SPORT_OPTIONS.map((sport) => ({
      ...sport,
      count: products.filter((product) => product.sport === sport.id).length,
    })),
    styles: STYLE_OPTIONS.map((label) => ({
      id: label.toLowerCase().replaceAll(' ', '-'),
      label,
      count: products.filter((product) => product.style?.toLowerCase() === label.toLowerCase()).length,
    })),
  }
}

// Keeps products that match the search text or chosen catalogue facets.
// An empty query or empty category means "no restriction".
export function filterProducts(products, { query = '', category = '', brand = '', sport = '', style = '' } = {}) {
  const needle = String(query ?? '').trim().toLowerCase()

  return products.filter((product) => {
    if (category && product.category !== category) return false
    if (brand && product.brand?.toLowerCase() !== brand.toLowerCase()) return false
    if (sport && product.sport !== sport) return false
    if (style && product.style?.toLowerCase().replaceAll(' ', '-') !== style) return false
    if (!needle) return true

    const searchable = `${product.id} ${product.slug} ${product.name} ${product.category} ${getCategoryLabel(product.category)} ${product.brand ?? ''} ${product.sport ?? ''} ${product.style ?? ''}`.toLowerCase()
    return searchable.includes(needle)
  })
}

// Returns a NEW sorted array. The original array is never changed.
export function sortProducts(products, sort = DEFAULT_SORT) {
  const copy = [...products]
  if (sort === 'brand-asc') return copy.sort((a, b) => (a.brand ?? '').localeCompare(b.brand ?? '') || a.name.localeCompare(b.name))
  if (sort === 'brand-desc') return copy.sort((a, b) => (b.brand ?? '').localeCompare(a.brand ?? '') || a.name.localeCompare(b.name))
  if (sort === 'price-asc') return copy.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') return copy.sort((a, b) => b.price - a.price)
  return copy // 'featured' keeps the order used in the data file
}

// Filter first, then sort: the one function the Shop page calls.
export function getVisibleProducts(products, { query, category, brand, sport, style, sort }) {
  return sortProducts(filterProducts(products, { query, category, brand, sport, style }), sort)
}
