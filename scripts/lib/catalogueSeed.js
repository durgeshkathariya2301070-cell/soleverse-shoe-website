// Builds the SQL that fills the catalogue tables from the sample data in src/data/products.js.
// Used by scripts/generate-catalogue-seed.js and checked by a test, so the SQL file can never
// silently drift away from the sample data.

export const SEED_BEGIN = '-- BEGIN GENERATED SEED (made by "npm run generate-seed" from src/data/products.js; do not edit by hand)'
export const SEED_END = '-- END GENERATED SEED'

// Escapes a value for a SQL string literal: O'Neil -> 'O''Neil'
const q = (value) => `'${String(value).replace(/'/g, "''")}'`

export function buildSeedSql(products) {
  const productRows = products.map((p) => `  (${q(p.id)}, ${q(p.slug)}, ${q(p.name)}, ${Number(p.price)})`)

  const variantRows = []
  for (const p of products) {
    for (const color of p.availableColors) {
      for (const size of p.availableSizes) {
        const stock = p.stockByVariant?.[color.id]?.[size] ?? 0
        variantRows.push(`  (${q(p.id)}, ${q(color.id)}, ${q(color.label)}, ${Number(size)}, ${Number(stock)})`)
      }
    }
  }

  return [
    SEED_BEGIN,
    '-- Existing rows are left alone ("do nothing"), so re-running never resets prices or stock.',
    'insert into public.products (id, slug, name, price_inr) values',
    productRows.join(',\n'),
    'on conflict (id) do nothing;',
    '',
    'insert into public.product_variants (product_id, color_id, color_label, size, stock) values',
    variantRows.join(',\n'),
    'on conflict (product_id, color_id, size) do nothing;',
    SEED_END,
  ].join('\n')
}

// Replaces whatever sits between the two marker lines in `sql`.
export function injectSeed(sql, seedBlock) {
  const start = sql.indexOf(SEED_BEGIN)
  const end = sql.indexOf(SEED_END)
  if (start === -1 || end === -1 || end < start) throw new Error('Seed markers not found in the SQL file.')
  return sql.slice(0, start) + seedBlock + sql.slice(end + SEED_END.length)
}

const legacyProductDefaults = {
  'sv-001': { category: 'running', oldShort: 'A low-profile runner with a clean, minimal upper.', oldImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff' },
  'sv-002': { category: 'lifestyle', oldShort: 'A relaxed everyday sneaker in a single tone.', oldImage: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a' },
  'sv-003': { category: 'streetwear', oldCategory: 'streetwear', oldShort: 'A high-top built to stand out on the street.', oldImage: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb' },
  'sv-004': { category: 'running', oldCategory: 'training', oldShort: 'A supportive trainer shape for gym sessions.', oldImage: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d' },
  'sv-005': { category: 'lifestyle', oldShort: 'A low-cut everyday pair with simple lines.', oldImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772' },
  'sv-006': { category: 'running', oldShort: 'A lightweight runner for everyday movement.', oldImage: 'https://images.unsplash.com/photo-1539185441755-769473a23570' },
  'sv-007': { category: 'basketball', oldCategory: 'streetwear', oldShort: 'A court-inspired silhouette with a bold profile.', oldImage: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519' },
  'sv-008': { category: 'running', oldCategory: 'training', oldShort: 'A flexible everyday sneaker built for comfort.', oldImage: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2' },
}

export const previousProductImages = {
  'sv-003': '/products/basketball-high-top.jpg',
  'sv-005': '/products/retro-court-sneaker.jpg',
  'sv-007': '/products/basketball-court-low.jpg',
  'sv-010': '/products/court-sneaker-detail.jpg',
  'sv-011': '/products/retro-court-sneaker.jpg',
  'sv-013': '/products/basketball-high-top.jpg',
  'sv-014': '/products/court-sneaker-detail.jpg',
  'sv-015': '/products/basketball-court-low.jpg',
  'sv-017': '/products/everyday-sneaker-white.jpg',
  'sv-019': '/products/court-sneaker-detail.jpg',
  'sv-021': '/products/skate-low-top.jpg',
  'sv-022': '/products/street-court-sneaker.jpg',
  'sv-023': '/products/basketball-court-low.jpg',
  'sv-025': '/products/court-sneaker-detail.jpg',
  'sv-026': '/products/trail-runner.jpg',
  'sv-027': '/products/training-knit-runner.jpg',
  'sv-028': '/products/lightweight-running-shoe.jpg',
  'sv-029': '/products/aero-runner-red.jpg',
  'sv-030': '/products/flex-trainer.jpg',
  'sv-031': '/products/street-court-sneaker.jpg',
  'sv-032': '/products/retro-court-sneaker.jpg',
  'sv-033': '/products/everyday-sneaker-white.jpg',
  'sv-034': '/products/court-sneaker-detail.jpg',
  'sv-035': '/products/lightweight-running-shoe.jpg',
  'sv-036': '/products/training-knit-runner.jpg',
  'sv-037': '/products/flex-trainer.jpg',
  'sv-038': '/products/aero-runner-red.jpg',
}

export function buildCatalogueImageFixSql(products) {
  const replacements = products.filter((product) =>
    previousProductImages[product.id]
    && previousProductImages[product.id] !== product.images[0]?.src,
  )
  if (replacements.length !== Object.keys(previousProductImages).length) {
    throw new Error(`Expected ${Object.keys(previousProductImages).length} image corrections, got ${replacements.length}.`)
  }

  const imageCases = replacements.map((product) =>
    `    when p.id = ${q(product.id)} and p.image_url = ${q(previousProductImages[product.id])} then ${q(product.images[0].src)}`,
  )
  const imageGuards = replacements.map((product) =>
    `(p.id = ${q(product.id)} and p.image_url = ${q(previousProductImages[product.id])})`,
  )

  return [
    '-- Correct mismatched catalogue photography without touching customer, order, variant, or inventory data.',
    '-- Each image changes only while it still equals the known previous value; admin-edited paths are preserved.',
    'update public.products as p',
    'set',
    `  image_url = case\n${imageCases.join('\n')}\n    else p.image_url\n  end,`,
    "  style = case when p.id = 'sv-024' and p.style = 'Low Dunk' then 'Skate Low' else p.style end",
    `where ${imageGuards.join('\n   or ')}\n   or (p.id = 'sv-024' and p.style = 'Low Dunk');`,
    '',
  ].join('\n')
}

function originalCatalogueImage(product) {
  return previousProductImages[product.id] ?? product.images[0]?.src ?? ''
}

export function buildCatalogueExpansionSql(products) {
  const additions = products.filter((product) => {
    const id = Number(product.id.slice(3))
    return id > 8 && id <= 30
  })
  if (additions.length !== 22) throw new Error(`Expected 22 new products, got ${additions.length}.`)

  const productRows = additions.map((product) => {
    const imageUrl = originalCatalogueImage(product)
    return `  (${q(product.id)}, ${q(product.slug)}, ${q(product.name)}, ${Number(product.price)}, true, ${q(product.category)}, ${q(product.shortDescription)}, ${q(product.description)}, ${q(imageUrl)})`
  })

  const variantRows = []
  for (const product of additions) {
    for (const color of product.availableColors) {
      for (const [size, stock] of Object.entries(product.stockByVariant[color.id] ?? {})) {
        variantRows.push(`  (${q(product.id)}, ${q(color.id)}, ${q(color.label)}, ${Number(size)}, ${Number(stock)}, ${q(color.hex)})`)
      }
    }
  }

  const legacyRows = products.filter((product) => legacyProductDefaults[product.id])
  const fieldCases = {
    category: (product, defaults) => `when p.id = ${q(product.id)} and p.category = ${q(defaults.oldCategory ?? defaults.category)} then ${q(product.category)}`,
    short_description: (product, defaults) => `when p.id = ${q(product.id)} and p.short_description = ${q(defaults.oldShort)} then ${q(product.shortDescription)}`,
    description: (product) => `when p.id = ${q(product.id)} and p.description = '' then ${q(product.description)}`,
    image_url: (product, defaults) => `when p.id = ${q(product.id)} and p.image_url = ${q(defaults.oldImage)} then ${q(originalCatalogueImage(product))}`,
  }
  const updateFields = Object.entries(fieldCases).map(([field, buildCase]) => {
    const clauses = legacyRows.map((product) => buildCase(product, legacyProductDefaults[product.id]))
    return `  ${field} = case ${clauses.map((clause) => `\n    ${clause}`).join('')}\n    else p.${field}\n  end`
  })

  return [
    '-- Add the 22 new catalogue entries without replacing existing product or inventory values.',
    '-- Existing seeded products are only normalized when their fields still match the original defaults.',
    'insert into public.products (id, slug, name, price_inr, is_active, category, short_description, description, image_url) values',
    productRows.join(',\n'),
    'on conflict (id) do nothing;',
    '',
    'insert into public.product_variants (product_id, color_id, color_label, size, stock, color_hex) values',
    variantRows.join(',\n'),
    'on conflict (product_id, color_id, size) do nothing;',
    '',
    `update public.products as p\nset\n${updateFields.join(',\n')}\nwhere p.id in (${legacyRows.map((product) => q(product.id)).join(', ')});`,
    '',
  ].join('\n')
}

export function buildCatalogueTaxonomySql(products) {
  const additions = products.filter((product) => Number(product.id.slice(3)) > 30)
  if (additions.length !== 12) throw new Error(`Expected 12 new products, got ${additions.length}.`)
  if (products.some((product) => !product.brand || !product.style)) {
    throw new Error('Every catalogue product must have a brand and style.')
  }

  const productRows = additions.map((product) => `  (${q(product.id)}, ${q(product.slug)}, ${q(product.name)}, ${Number(product.price)}, true, ${q(product.category)}, ${q(product.shortDescription)}, ${q(product.description)}, ${q(originalCatalogueImage(product))}, ${q(product.brand)}, ${product.sport ? q(product.sport) : 'null'}, ${q(product.style)})`)
  const variantRows = []
  for (const product of additions) {
    for (const color of product.availableColors) {
      for (const [size, stock] of Object.entries(product.stockByVariant[color.id] ?? {})) {
        variantRows.push(`  (${q(product.id)}, ${q(color.id)}, ${q(color.label)}, ${Number(size)}, ${Number(stock)}, ${q(color.hex)})`)
      }
    }
  }

  const idList = products.map((product) => q(product.id)).join(', ')
  const fieldCase = (field) => {
    const cases = products.map((product) => {
      const value = field === 'style' && product.id === 'sv-024' ? 'Low Dunk' : product[field]
      return value ? `\n    when ${q(product.id)} then ${q(value)}` : ''
    }).join('')
    return `case p.id${cases}\n    else null\n  end`
  }

  return [
    '-- Add optional catalogue facets and new formal/sports products without replacing prices or stock.',
    'alter table public.products',
    '  add column if not exists brand text,',
    '  add column if not exists sport text,',
    '  add column if not exists style text;',
    '',
    '-- Keep basketball within the Sports category; the sport facet carries the specific discipline.',
    `update public.products set category = 'sports' where id in ('sv-003', 'sv-007', 'sv-013', 'sv-014', 'sv-015') and category = 'basketball';`,
    '',
    '-- Fill only unset metadata so re-running this migration preserves administrator edits.',
    `update public.products as p\nset\n  brand = coalesce(p.brand, ${fieldCase('brand')}),\n  sport = coalesce(p.sport, ${fieldCase('sport')}),\n  style = coalesce(p.style, ${fieldCase('style')})\nwhere p.id in (${idList});`,
    '',
    'insert into public.products (id, slug, name, price_inr, is_active, category, short_description, description, image_url, brand, sport, style) values',
    productRows.join(',\n'),
    'on conflict (id) do nothing;',
    '',
    'insert into public.product_variants (product_id, color_id, color_label, size, stock, color_hex) values',
    variantRows.join(',\n'),
    'on conflict (product_id, color_id, size) do nothing;',
    '',
  ].join('\n')
}
