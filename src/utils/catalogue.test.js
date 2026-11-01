// Tests for the catalogue helpers, using Node's built-in test runner (no extra packages).
// Run with:  npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { products, publicSampleProducts, getStock, getAvailableSizes, isSoldOut, getRelatedProducts, getProductBySlug, has3DModel } from '../data/products.js'
import { categories } from '../data/categories.js'
import {
  filterProducts,
  sortProducts,
  getVisibleProducts,
  getCategoryOptions,
  getCatalogueFilterOptions,
  normalizeSort,
  resolveCategorySelection,
} from './catalogue.js'
import { formatPrice } from './formatPrice.js'

test('empty search and no category returns every product', () => {
  assert.equal(filterProducts(products, {}).length, products.length)
  assert.equal(filterProducts(products, { query: '   ' }).length, products.length)
  assert.equal(filterProducts(products, { query: null }).length, products.length)
})

test('search matches product names ignoring capitalisation', () => {
  const result = filterProducts(products, { query: 'aERo' })
  assert.deepEqual(result.map((p) => p.slug), ['aero-runner-01'])
})

test('customer search finds published database products by product ID and slug', () => {
  const product = {
    id: 'sv-test-low-001',
    slug: 'soleverse-street-low',
    name: 'SOLEVERSE Street Low',
    category: 'lifestyle',
    brand: 'SOLEVERSE',
    sport: '',
    style: 'Low Dunk',
    price: 3000,
    availableSizes: [7, 8],
    availableColors: [{ id: 'black', label: 'Core Black', hex: '#171717' }],
    stockByVariant: { black: { 7: 12, 8: 13 } },
  }

  assert.ok(getStock(product, 'black', 7) > 0)
  assert.equal(isSoldOut(product), false)
  assert.deepEqual(getVisibleProducts([product], { query: 'sv-test-low-001' }), [product])
  assert.deepEqual(getVisibleProducts([product], { query: 'soleverse-street-low' }), [product])
  assert.deepEqual(getVisibleProducts([product], { query: 'SOLEVERSE Street Low' }), [product])
})

test('search also matches category names', () => {
  const result = filterProducts(products, { query: 'running' })
  assert.equal(result.length, 5)
  assert.ok(result.every((product) => product.category === 'running'))
})

test('search with no matches returns an empty list', () => {
  assert.deepEqual(filterProducts(products, { query: 'zzzz' }), [])
})

test('category filter keeps only that category', () => {
  const result = filterProducts(products, { category: 'trail' })
  assert.ok(result.length > 0)
  assert.ok(result.every((p) => p.category === 'trail'))
})

test('search and category work together', () => {
  const result = filterProducts(products, { query: 'core', category: 'trail' })
  assert.deepEqual(result, [])
  assert.deepEqual(filterProducts(products, { query: 'core', category: 'running' }).map((product) => product.slug), ['core-flex'])
})

test('sorting by price works and does not change the original array', () => {
  const before = products.map((p) => p.slug)
  const asc = sortProducts(products, 'price-asc').map((p) => p.price)
  const desc = sortProducts(products, 'price-desc').map((p) => p.price)
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b))
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a))
  assert.deepEqual(products.map((p) => p.slug), before)
})

test('sorting by brand is alphabetical and supports both directions', () => {
  const ascending = sortProducts(products, 'brand-asc')
  const descending = sortProducts(products, 'brand-desc')
  assert.deepEqual(ascending.map((product) => product.brand), [...ascending.map((product) => product.brand)].sort((a, b) => a.localeCompare(b)))
  assert.deepEqual(descending.map((product) => product.brand), [...descending.map((product) => product.brand)].sort((a, b) => b.localeCompare(a)))
})

test('featured sort keeps the data-file order', () => {
  assert.deepEqual(sortProducts(products, 'featured').map((p) => p.slug), products.map((p) => p.slug))
})

test('unknown sort values fall back to featured', () => {
  assert.equal(normalizeSort('nonsense'), 'featured')
  assert.equal(normalizeSort('price-asc'), 'price-asc')
})

test('filters and sorting combine', () => {
  const result = getVisibleProducts(products, { query: '', category: 'lifestyle', sort: 'price-desc' })
  assert.equal(result.length, 5)
  assert.ok(result.every((product) => product.category === 'lifestyle'))
  assert.deepEqual(result.map((product) => product.price), [...result.map((product) => product.price)].sort((a, b) => b - a))
})

test('category options are built from the product data', () => {
  const options = getCategoryOptions(products)
  const total = options.reduce((sum, option) => sum + option.count, 0)
  assert.equal(total, products.length)
  assert.ok(options.every((option) => option.label && option.id))
})

test('category filters stay available while the database catalogue is incomplete', () => {
  const options = getCategoryOptions(products.filter((product) => product.category !== 'sports'))
  assert.deepEqual(options.map((option) => option.id), ['lifestyle', 'running', 'sports', 'casual', 'skate', 'trail', 'formal'])
  assert.equal(options.find((option) => option.id === 'sports').count, 0)
})

test('sport category URLs resolve to the canonical Sports category and exact sport filter', () => {
  for (const sport of ['basketball', 'football', 'cricket']) {
    assert.deepEqual(resolveCategorySelection(sport), { category: 'sports', sport })
  }
  assert.deepEqual(resolveCategorySelection('formal'), { category: 'formal', sport: '' })
  assert.deepEqual(resolveCategorySelection('unknown'), { category: '', sport: '' })

  for (const sport of ['basketball', 'football', 'cricket']) {
    const result = getVisibleProducts(publicSampleProducts, {
      ...resolveCategorySelection(sport),
    })
    assert.ok(result.every((product) => product.category === 'sports' && product.sport === sport))
  }
  assert.deepEqual(
    getVisibleProducts(publicSampleProducts, resolveCategorySelection('cricket')),
    [],
    'unverified cricket sample footwear must not be shown in the Cricket filter',
  )
})

test('brand, sport and style filters combine with category and price sorting', () => {
  const options = getCatalogueFilterOptions(products)
  assert.deepEqual(options.brands.map((item) => item.label), ['Adidas', 'Converse', 'Jordan', 'Nike'])
  assert.ok(options.sports.find((item) => item.id === 'football').count > 0)
  assert.ok(options.sports.find((item) => item.id === 'cricket').count > 0)
  assert.ok(options.sports.find((item) => item.id === 'basketball').count > 0)
  assert.ok(options.styles.find((item) => item.id === 'low-dunk').count > 0)
  assert.ok(options.styles.find((item) => item.id === 'low-top').count > 0)
  const result = getVisibleProducts(products, { category: 'sports', sport: 'football', brand: 'nike', sort: 'price-asc' })
  assert.ok(result.length > 0)
  assert.ok(result.every((product) => product.category === 'sports' && product.sport === 'football' && product.brand === 'Nike'))
  assert.deepEqual(result.map((product) => product.price), [...result.map((product) => product.price)].sort((a, b) => a - b))
  const lowDunk = getVisibleProducts(products, { style: 'low-dunk' })
  assert.ok(lowDunk.length > 0)
  assert.ok(lowDunk.every((product) => product.style === 'Low Dunk'))
  const lowTop = getVisibleProducts(products, { style: 'low-top' })
  assert.ok(lowTop.length > 0)
  assert.ok(lowTop.every((product) => product.style === 'Low Top'))
})

test('every product has the same required fields and valid references', () => {
  const categoryIds = categories.map((c) => c.id)
  const slugs = new Set()
  for (const p of products) {
    assert.ok(p.id && p.slug && p.name, `${p.id} needs id, slug and name`)
    assert.ok(!slugs.has(p.slug), `duplicate slug ${p.slug}`)
    slugs.add(p.slug)
    assert.ok(categoryIds.includes(p.category), `${p.slug} has unknown category`)
    assert.equal(typeof p.price, 'number')
    assert.ok(p.originalPrice === null || p.originalPrice > p.price, `${p.slug} originalPrice must exceed price`)
    assert.ok(p.shortDescription && p.description)
    assert.ok(p.brand && p.style, `${p.slug} needs brand and style metadata`)
    assert.ok(p.images.length >= 1 && p.images.every((img) => img.alt && (img.unsplashId || img.src)))
    assert.ok(p.images[0].src.startsWith('/products/'), `${p.slug} must use a local product photo`)
    assert.ok(p.availableSizes.length > 0 && p.availableColors.length > 0)
    const colorIds = p.availableColors.map((c) => c.id)
    for (const colorId of Object.keys(p.stockByVariant)) {
      assert.ok(colorIds.includes(colorId), `${p.slug} stock refers to unknown colour ${colorId}`)
      for (const size of Object.keys(p.stockByVariant[colorId])) {
        assert.ok(p.availableSizes.includes(Number(size)), `${p.slug} stock refers to unknown size ${size}`)
      }
    }
  }
})

test('the catalogue has 42 distinct products across the requested types and sports', () => {
  const expectedCategories = {
    lifestyle: 5,
    running: 5,
    sports: 13,
    casual: 5,
    skate: 5,
    trail: 5,
    formal: 4,
  }
  assert.equal(products.length, 42)
  for (const [category, count] of Object.entries(expectedCategories)) {
    assert.equal(products.filter((product) => product.category === category).length, count, category)
  }
  assert.equal(products.filter((product) => product.category === 'sports' && product.sport === 'basketball').length, 5)
  assert.equal(products.filter((product) => product.category === 'sports' && product.sport === 'football').length, 4)
  assert.equal(products.filter((product) => product.category === 'sports' && product.sport === 'cricket').length, 4)
  assert.deepEqual(
    ['Nike', 'Adidas', 'Jordan', 'Converse'].map((brand) => [brand, products.filter((product) => product.brand === brand).length]),
    [['Nike', 12], ['Adidas', 12], ['Jordan', 8], ['Converse', 10]],
  )
  assert.equal(new Set(products.map((product) => product.id)).size, products.length)
  assert.equal(new Set(products.map((product) => product.slug)).size, products.length)
})

test('public sample catalogue excludes unverified listings and unverified brand labels', () => {
  const hiddenIds = [
    'sv-013', 'sv-014', 'sv-015', 'sv-018',
    'sv-022', 'sv-023', 'sv-024', 'sv-025',
    'sv-030', 'sv-031', 'sv-032', 'sv-033', 'sv-034', 'sv-038',
    'sv-039', 'sv-040', 'sv-041', 'sv-042',
  ]
  assert.ok(hiddenIds.every((id) => !publicSampleProducts.some((product) => product.id === id)))
  assert.ok(publicSampleProducts.every((product) => product.brand === ''))
  assert.equal(getCatalogueFilterOptions(publicSampleProducts).brands.length, 0)
  assert.deepEqual(
    getVisibleProducts(publicSampleProducts, { sport: 'cricket' }),
    [],
  )
})

test('every product image exists locally and key categories use category-appropriate footwear', () => {
  for (const product of products) {
    const imagePath = product.images[0].src
    assert.ok(imagePath.startsWith('/products/'), `${product.slug} must use a local image`)
    assert.ok(existsSync(path.join(process.cwd(), 'public', imagePath.slice(1))), `${product.slug}: ${imagePath} is missing`)
  }

  for (const category of categories) {
    const categoryProducts = getVisibleProducts(publicSampleProducts, { category: category.id })
    assert.ok(categoryProducts.every((product) => product.category === category.id), `${category.id} filter returned another category`)
  }
  assert.ok(publicSampleProducts.filter((product) => product.category === 'trail').every((product) => product.images[0].src.startsWith('/products/trail-runner-')))
  assert.ok(publicSampleProducts.filter((product) => product.category === 'skate').every((product) => product.images[0].src === '/products/canvas-sneaker.jpg'))
  assert.ok(publicSampleProducts.filter((product) => product.sport === 'football').every((product) => product.images[0].src.startsWith('/products/football-boots-')))
  assert.ok(publicSampleProducts.filter((product) => product.sport === 'basketball').every((product) => /basketball-court-low|retro-court|street-court|skate-low-top/.test(product.images[0].src)))
  assert.ok(publicSampleProducts.filter((product) => product.style === 'Low Dunk').every((product) => /court|street-court/.test(product.images[0].src)))
  assert.equal(products.find((product) => product.id === 'sv-024').style, 'Skate Low')
  assert.ok(publicSampleProducts.every((product) => new Set(product.images.map((image) => image.src)).size === product.images.length))
})

test('3D fields are used consistently', () => {
  for (const p of products) {
    if (!has3DModel(p)) {
      assert.equal(p.modelPath, undefined, `${p.slug} has modelPath but supports3D is not true`)
      assert.equal(p.customizableMaterials, undefined, `${p.slug} has customizableMaterials without a model`)
      continue
    }
    assert.ok(p.modelPath.startsWith('/') && p.modelPath.endsWith('.glb'), `${p.slug} modelPath should be a /…glb path`)
    const ids = (p.customizableMaterials ?? []).map((item) => item.id)
    assert.equal(new Set(ids).size, ids.length, `${p.slug} has duplicate customisation ids`)
    for (const item of p.customizableMaterials ?? []) {
      assert.ok(item.id && item.label && item.materialName, `${p.slug} customisation needs id, label and materialName`)
    }
  }
  // Each model path must belong to one product only (no pretending one model is many products).
  const paths = products.filter(has3DModel).map((p) => p.modelPath)
  assert.equal(new Set(paths).size, paths.length)
  assert.equal(has3DModel(getProductBySlug('aero-runner-01')), true)
  assert.equal(has3DModel(getProductBySlug('drift-low')), false)
  assert.equal(has3DModel({ supports3D: true }), false)
})

test('stock helpers behave as expected', () => {
  const runner = getProductBySlug('aero-runner-01')
  assert.equal(getStock(runner, 'black', 8), 6)
  assert.equal(getStock(runner, 'black', 10), 0)
  assert.equal(getStock(runner, 'black', 99), 0)
  assert.equal(getStock(runner, 'not-a-colour', 8), 0)
  assert.deepEqual(getAvailableSizes(runner, 'black'), [6, 7, 8, 9, 11])
  assert.equal(isSoldOut(runner), false)
  assert.equal(isSoldOut(getProductBySlug('block-court')), true)
})

test('related products exclude the current product and respect the limit', () => {
  const related = getRelatedProducts('aero-runner-01', 4)
  assert.equal(related.length, 4)
  assert.ok(related.every((p) => p.slug !== 'aero-runner-01'))
  assert.equal(related[0].slug, 'pulse-trainer') // same category comes first
  assert.deepEqual(getRelatedProducts('does-not-exist'), [])
})

test('prices are formatted as Indian rupees', () => {
  assert.equal(formatPrice(4999).replace(/\s/g, ''), '₹4,999')
  assert.equal(formatPrice(125000).replace(/\s/g, ''), '₹1,25,000')
})
