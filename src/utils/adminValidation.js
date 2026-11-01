const SLUG = /^[a-z0-9-]{1,40}$/

export function validateAdminProduct(input) {
  const errors = {}
  const id = String(input.id ?? '').trim()
  const slug = String(input.slug ?? '').trim()
  const name = String(input.name ?? '').trim()
  const category = String(input.category ?? '').trim()
  const brand = String(input.brand ?? '').trim()
  const sport = String(input.sport ?? '').trim()
  const style = String(input.style ?? '').trim()
  const price = Number(input.price_inr)
  const imageUrl = String(input.image_url ?? '').trim()

  if (!SLUG.test(id)) errors.id = 'Use 1–40 lowercase letters, numbers, or hyphens.'
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) errors.slug = 'Use 1–80 lowercase letters, numbers, or hyphens.'
  if (name.length < 1 || name.length > 120) errors.name = 'Name must be 1–120 characters.'
  if (!SLUG.test(category)) errors.category = 'Use a short lowercase category id, such as running.'
  if (brand.length > 60) errors.brand = 'Brand must be 60 characters or fewer.'
  if (sport && !/^[a-z0-9-]{1,40}$/.test(sport)) errors.sport = 'Use a short lowercase sport id, such as basketball.'
  if (style.length > 60) errors.style = 'Style must be 60 characters or fewer.'
  if (!String(input.price_inr ?? '').trim() || !/^\d+$/.test(String(input.price_inr).trim()) || !Number.isInteger(price) || price < 1 || price > 1000000) {
    errors.price_inr = 'Price must be an integer from ₹1 to ₹10,00,000.'
  }
  if (imageUrl.length > 2048 || (imageUrl && !(/^(https?:\/\/|\/)/i.test(imageUrl)))) {
    errors.image_url = 'Use an https/http image URL or a site-relative path.'
  }
  if (String(input.short_description ?? '').length > 240) errors.short_description = 'Keep the short description under 240 characters.'
  if (String(input.description ?? '').length > 5000) errors.description = 'Keep the description under 5,000 characters.'
  return errors
}

export function validateAdminVariant(input) {
  const errors = {}
  const productId = String(input.product_id ?? '')
  const colorId = String(input.color_id ?? '').trim()
  const colorLabel = String(input.color_label ?? '').trim()
  const size = Number(input.size)
  const stock = Number(input.stock)
  const hex = String(input.color_hex ?? '')
  if (!SLUG.test(productId)) errors.product_id = 'Choose a valid product.'
  if (!/^[a-z0-9-]{1,30}$/.test(colorId)) errors.color_id = 'Use 1–30 lowercase letters, numbers, or hyphens.'
  if (colorLabel.length < 1 || colorLabel.length > 60) errors.color_label = 'Colour name must be 1–60 characters.'
  if (!Number.isInteger(size) || size < 1 || size > 20) errors.size = 'Size must be an integer from 1 to 20.'
  if (!String(input.stock ?? '').trim() || !/^\d+$/.test(String(input.stock).trim()) || !Number.isInteger(stock) || stock < 0 || stock > 100000) {
    errors.stock = 'Stock must be an integer from 0 to 100,000.'
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex)) errors.color_hex = 'Use a six-digit hex colour, for example #171717.'
  return errors
}

export function validateAdminProductVariants(variants) {
  const errors = {}
  const seen = new Set()

  variants.forEach((variant, index) => {
    const prefix = `variants.${index}.`
    const colorId = String(variant.color_id ?? '').trim()
    const colorLabel = String(variant.color_label ?? '').trim()
    const sizeText = String(variant.size ?? '').trim()
    const size = Number(sizeText)
    const stockText = String(variant.stock ?? '').trim()
    const stock = Number(stockText)
    const colorHex = String(variant.color_hex ?? '')
    const key = `${colorId}|${sizeText}`

    if (!/^[a-z0-9-]{1,30}$/.test(colorId)) errors[`${prefix}color_id`] = 'Use 1–30 lowercase letters, numbers, or hyphens.'
    if (colorLabel.length < 1 || colorLabel.length > 60) errors[`${prefix}color_label`] = 'Colour name must be 1–60 characters.'
    if (!Number.isInteger(size) || size < 1 || size > 20) errors[`${prefix}size`] = 'UK size must be an integer from 1 to 20.'
    if (!/^\d+$/.test(stockText) || !Number.isInteger(stock) || stock < 0 || stock > 100000) errors[`${prefix}stock`] = 'Stock must be an integer from 0 to 100,000.'
    if (!/^#[0-9a-f]{6}$/i.test(colorHex)) errors[`${prefix}color_hex`] = 'Choose a valid colour swatch.'
    if (colorId && sizeText && seen.has(key)) errors[`${prefix}size`] = 'This colour and size combination is duplicated.'
    seen.add(key)
  })

  return errors
}
