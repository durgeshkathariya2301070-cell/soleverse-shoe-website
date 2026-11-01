// Pure bag (cart) logic: no React, no browser, no Supabase, so every rule can be tested.
//
// A bag is a list of "lines". One line = one shoe + colour + size, with a quantity:
//   { productId: 'sv-001', colorId: 'black', size: 8, quantity: 2 }
// A line never holds a price. Prices are looked up when needed, and the database has the final say.
import { DELIVERY_FEE_INR, MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from '../data/checkoutConfig.js'

// The identity of a line. Two lines with the same key are the same pair of shoes.
export const cartKey = (line) => `${line.productId}|${line.colorId}|${line.size}`

const clampQuantity = (value) => {
  const number = Math.floor(Number(value))
  if (!Number.isFinite(number) || number < 1) return 1
  return Math.min(number, MAX_QUANTITY_PER_LINE)
}

// Adds one pair (or `quantity` pairs). Returns { items, status } and never changes the list you pass in.
//   status: 'added' | 'quantity_limit' (already at the maximum for this line) | 'line_limit' (bag is full) | 'invalid'
export function addToCart(items, line, quantity = 1) {
  const isValid =
    line &&
    typeof line.productId === 'string' &&
    typeof line.colorId === 'string' &&
    Number.isInteger(line.size) &&
    Number.isInteger(quantity) &&
    quantity >= 1
  if (!isValid) return { items, status: 'invalid' }

  const key = cartKey(line)
  const existing = items.find((item) => cartKey(item) === key)
  if (existing) {
    if (existing.quantity >= MAX_QUANTITY_PER_LINE) return { items, status: 'quantity_limit' }
    const next = clampQuantity(existing.quantity + quantity)
    return {
      items: items.map((item) => (item === existing ? { ...item, quantity: next } : item)),
      status: 'added',
    }
  }
  if (items.length >= MAX_CART_LINES) return { items, status: 'line_limit' }
  return {
    items: [...items, { productId: line.productId, colorId: line.colorId, size: line.size, quantity: clampQuantity(quantity) }],
    status: 'added',
  }
}

// Sets a line's quantity. A quantity below 1 removes the line.
export function setQuantity(items, key, quantity) {
  if (!Number.isFinite(Number(quantity)) || Number(quantity) < 1) return removeLine(items, key)
  return items.map((item) => (cartKey(item) === key ? { ...item, quantity: clampQuantity(quantity) } : item))
}

export const removeLine = (items, key) => items.filter((item) => cartKey(item) !== key)

// Combines two bags (for example the bag built while logged out and the bag saved in your account).
// For a line that is in both, the larger quantity wins: adding the two would double-count
// the same pair when this browser's bag is simply a copy of the saved one.
export function mergeCarts(first, second) {
  const merged = new Map()
  for (const item of [...first, ...second]) {
    const key = cartKey(item)
    const seen = merged.get(key)
    merged.set(key, seen ? { ...seen, quantity: Math.max(seen.quantity, item.quantity) } : { ...item })
  }
  return [...merged.values()].slice(0, MAX_CART_LINES)
}

export const sameCart = (a, b) => {
  if (a.length !== b.length) return false
  const byKey = new Map(a.map((item) => [cartKey(item), item.quantity]))
  return b.every((item) => byKey.get(cartKey(item)) === item.quantity)
}

// Cleans anything read from storage or the server: drops lines for shoes, colours or sizes that
// do not exist in the catalogue, fixes quantities, merges duplicates, enforces the line limit.
// `catalogue` is the list of products (src/data/products.js).
export function sanitizeCart(raw, catalogue) {
  if (!Array.isArray(raw)) return []
  const clean = []
  const seen = new Set()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const product = catalogue.find((candidate) => candidate.id === entry.productId)
    const size = Number(entry.size)
    if (!product || !Number.isInteger(size)) continue
    if (!product.availableColors.some((color) => color.id === entry.colorId)) continue
    if (!product.availableSizes.includes(size)) continue
    const line = { productId: product.id, colorId: entry.colorId, size, quantity: clampQuantity(entry.quantity) }
    const key = cartKey(line)
    if (seen.has(key)) {
      const first = clean.find((item) => cartKey(item) === key)
      first.quantity = Math.max(first.quantity, line.quantity)
      continue
    }
    seen.add(key)
    clean.push(line)
  }
  return clean.slice(0, MAX_CART_LINES)
}

// Adds product details (name, price, photo, colour name, sample stock) to each line for display.
// Lines whose product no longer exists are skipped. `status` is one of:
//   'ok' | 'low_stock' (asking for more than the sample stock) | 'sold_out'
// These details come from the sample data and are only for display. At checkout the database
// re-checks everything.
export function resolveLines(items, catalogue) {
  const lines = []
  for (const item of items) {
    const product = catalogue.find((candidate) => candidate.id === item.productId)
    const color = product?.availableColors.find((candidate) => candidate.id === item.colorId)
    if (!product || !color) continue
    const stock = product.stockByVariant?.[item.colorId]?.[item.size] ?? 0
    lines.push({
      ...item,
      key: cartKey(item),
      product,
      name: product.name,
      slug: product.slug,
      colorLabel: color.label,
      colorHex: color.hex,
      image: product.images[0],
      unitPrice: product.price,
      lineTotal: product.price * item.quantity,
      stock,
      status: stock <= 0 ? 'sold_out' : item.quantity > stock ? 'low_stock' : 'ok',
    })
  }
  return lines
}

// Money is whole rupees. An empty bag has no delivery fee.
export function computeTotals(lines) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const deliveryFee = lines.length > 0 ? DELIVERY_FEE_INR : 0
  return { subtotal, deliveryFee, total: subtotal + deliveryFee, itemCount }
}

export const countItems = (items) => items.reduce((sum, item) => sum + item.quantity, 0)

// The shape the database functions expect. Note: no price, only what the customer chose.
export const toRpcItems = (items) =>
  items.map((item) => ({ product_id: item.productId, color_id: item.colorId, size: item.size, quantity: item.quantity }))

// Rows from the cart_items table -> bag lines.
export const fromServerRows = (rows) =>
  (rows ?? []).map((row) => ({ productId: row.product_id, colorId: row.color_id, size: row.size, quantity: row.quantity }))
