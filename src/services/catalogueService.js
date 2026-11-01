import { supabase } from '../lib/supabaseClient.js'
import { products as allSampleProducts, publicSampleProducts } from '../data/products.js'

const staticById = new Map(allSampleProducts.map((product) => [product.id, product]))

const OBSOLETE_IMAGES = {
  'sv-003': { from: '/products/basketball-high-top.jpg', to: '/products/retro-court-sneaker.jpg' },
  'sv-005': { from: '/products/retro-court-sneaker.jpg', to: '/products/court-sneaker-detail.jpg' },
  'sv-007': { from: '/products/basketball-court-low.jpg', to: '/products/street-court-sneaker.jpg' },
  'sv-010': { from: '/products/court-sneaker-detail.jpg', to: '/products/training-knit-runner.jpg' },
  'sv-011': { from: '/products/retro-court-sneaker.jpg', to: '/products/basketball-court-low.jpg' },
  'sv-013': { from: '/products/basketball-high-top.jpg', to: '/products/retro-court-sneaker.jpg' },
  'sv-014': { from: '/products/court-sneaker-detail.jpg', to: '/products/basketball-court-low.jpg' },
  'sv-015': { from: '/products/basketball-court-low.jpg', to: '/products/retro-court-sneaker.jpg' },
  'sv-017': { from: '/products/everyday-sneaker-white.jpg', to: '/products/basketball-court-low.jpg' },
  'sv-019': { from: '/products/court-sneaker-detail.jpg', to: '/products/retro-court-sneaker.jpg' },
  'sv-021': { from: '/products/skate-low-top.jpg', to: '/products/canvas-sneaker.jpg' },
  'sv-022': { from: '/products/street-court-sneaker.jpg', to: '/products/canvas-sneaker.jpg' },
  'sv-023': { from: '/products/basketball-court-low.jpg', to: '/products/canvas-sneaker.jpg' },
  'sv-025': { from: '/products/court-sneaker-detail.jpg', to: '/products/canvas-sneaker.jpg' },
  'sv-026': { from: '/products/trail-runner.jpg', to: '/products/trail-runner-altra.jpg' },
  'sv-027': { from: '/products/training-knit-runner.jpg', to: '/products/trail-runner-merrell.jpg' },
  'sv-028': { from: '/products/lightweight-running-shoe.jpg', to: '/products/trail-runner-mizuno.jpg' },
  'sv-029': { from: '/products/aero-runner-red.jpg', to: '/products/trail-runner-newbalance.jpg' },
  'sv-030': { from: '/products/flex-trainer.jpg', to: '/products/trail-runner-altra.jpg' },
  'sv-031': { from: '/products/street-court-sneaker.jpg', to: '/products/formal-dress-shoe-01.jpg' },
  'sv-032': { from: '/products/retro-court-sneaker.jpg', to: '/products/formal-dress-shoe-02.jpg' },
  'sv-033': { from: '/products/everyday-sneaker-white.jpg', to: '/products/formal-dress-shoe-03.jpg' },
  'sv-034': { from: '/products/court-sneaker-detail.jpg', to: '/products/formal-dress-shoe-04.jpg' },
  'sv-035': { from: '/products/lightweight-running-shoe.jpg', to: '/products/football-boots-gola.jpg' },
  'sv-036': { from: '/products/training-knit-runner.jpg', to: '/products/football-boots-nivia.jpg' },
  'sv-037': { from: '/products/flex-trainer.jpg', to: '/products/football-boots-inzaghi.jpg' },
  'sv-038': { from: '/products/aero-runner-red.jpg', to: '/products/football-boots-baggio.jpg' },
}

export async function fetchPublicCatalogue() {
  if (!supabase) return { products: publicSampleProducts, error: null, source: 'sample' }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, name, price_inr, is_active, category, brand, sport, style, short_description, description, image_url, product_variants(color_id, color_label, color_hex, size, stock), product_images(image_url, alt_text, position)')
      .eq('is_active', true)
      .order('name')
    if (error) return { products: publicSampleProducts, error: 'Could not refresh the database catalogue. Check admin access and apply catalogue migrations through 20261026000300_review_unverified_catalogue_products.sql.', source: 'sample' }

    const mapped = (data ?? []).map((row) => {
      const original = staticById.get(row.id)
      const variants = row.product_variants ?? []
      const colorMap = new Map()
      const stockByVariant = {}
      const sizes = new Set()
      for (const variant of variants) {
        if (!colorMap.has(variant.color_id)) {
          colorMap.set(variant.color_id, {
            id: variant.color_id,
            label: variant.color_label,
            hex: variant.color_hex ?? '#777777',
          })
        }
        sizes.add(variant.size)
        stockByVariant[variant.color_id] ??= {}
        stockByVariant[variant.color_id][variant.size] = variant.stock
      }
      const sameName = row.name === original?.name
      const rawImage = row.image_url || original?.images?.[0]?.src || ''
      const correctedImage = (OBSOLETE_IMAGES[row.id]?.from === rawImage)
        ? OBSOLETE_IMAGES[row.id].to
        : rawImage
      const galleryRows = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)
      const images = galleryRows.length
        ? galleryRows.map((image, index) => ({
          src: image.image_url,
          alt: image.alt_text || `${row.name}, ${index === 0 ? 'main' : `view ${index + 1}`} product photo`,
          label: index === 0 ? 'Main view' : `View ${index + 1}`,
        }))
        : correctedImage
          ? [{ src: correctedImage, alt: `${row.name}, product photo`, label: 'Main view' }]
          : (sameName ? original?.images : null) ?? [{ src: '', alt: `${row.name}, product photo`, label: 'Main view' }]

      return {
        ...original,
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        brand: row.brand ?? original?.brand ?? '',
        sport: row.sport ?? original?.sport ?? '',
        style: row.style ?? original?.style ?? '',
        price: row.price_inr,
        originalPrice: undefined,
        badge: undefined,
        shortDescription: row.short_description || (sameName ? original?.shortDescription : '') || '',
        description: row.description || (sameName ? original?.description : '') || '',
        images,
        availableSizes: [...sizes].sort((a, b) => a - b),
        availableColors: [...colorMap.values()],
        stockByVariant,
        featured: original?.featured ?? false,
      }
    })
    return { products: mapped, error: null, source: 'database' }
  } catch {
    return { products: publicSampleProducts, error: 'Could not connect to the database catalogue. Check your connection and try again.', source: 'sample' }
  }
}
