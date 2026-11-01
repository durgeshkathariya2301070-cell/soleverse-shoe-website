import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addToCart, cartKey, computeTotals, countItems, fromServerRows, mergeCarts, removeLine,
  resolveLines, sameCart, sanitizeCart, setQuantity, toRpcItems,
} from './cart.js'
import { products } from '../data/products.js'
import { DELIVERY_FEE_INR, MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from '../data/checkoutConfig.js'

const line = (over = {}) => ({ productId: 'sv-001', colorId: 'black', size: 8, quantity: 1, ...over })

test('cart: adding the same pair twice makes ONE line with quantity 2', () => {
  let { items } = addToCart([], line())
  items = addToCart(items, line()).items
  assert.equal(items.length, 1)
  assert.equal(items[0].quantity, 2)
})

test('cart: a different size or colour is a separate line', () => {
  let { items } = addToCart([], line())
  items = addToCart(items, line({ size: 9 })).items
  items = addToCart(items, line({ colorId: 'lime' })).items
  assert.equal(items.length, 3)
})

test('cart: add never changes the list it was given', () => {
  const original = [line()]
  const frozen = JSON.stringify(original)
  addToCart(original, line())
  assert.equal(JSON.stringify(original), frozen)
})

test('cart: quantity stops at the per-line maximum and says so', () => {
  let items = [line({ quantity: MAX_QUANTITY_PER_LINE - 1 })]
  let result = addToCart(items, line())
  assert.equal(result.status, 'added')
  assert.equal(result.items[0].quantity, MAX_QUANTITY_PER_LINE)
  result = addToCart(result.items, line())
  assert.equal(result.status, 'quantity_limit')
  assert.equal(result.items[0].quantity, MAX_QUANTITY_PER_LINE)
})

test('cart: the bag refuses a new line once it holds the maximum number of lines', () => {
  const full = Array.from({ length: MAX_CART_LINES }, (_, i) => line({ size: i + 1 }))
  const result = addToCart(full, line({ size: 40 }))
  assert.equal(result.status, 'line_limit')
  assert.equal(result.items.length, MAX_CART_LINES)
  // but a line already in the bag can still grow
  assert.equal(addToCart(full, line({ size: 1 })).status, 'added')
})

test('cart: invalid lines are refused', () => {
  assert.equal(addToCart([], null).status, 'invalid')
  assert.equal(addToCart([], line({ size: 'eight' })).status, 'invalid')
  assert.equal(addToCart([], line(), 0).status, 'invalid')
  assert.equal(addToCart([], line(), 1.5).status, 'invalid')
})

test('cart: setQuantity changes, clamps, and removes below 1', () => {
  const key = cartKey(line())
  assert.equal(setQuantity([line()], key, 4)[0].quantity, 4)
  assert.equal(setQuantity([line()], key, 99)[0].quantity, MAX_QUANTITY_PER_LINE)
  assert.deepEqual(setQuantity([line()], key, 0), [])
  assert.deepEqual(setQuantity([line()], key, 'abc'), [])
  assert.equal(setQuantity([line()], 'other|key|1', 5)[0].quantity, 1)
})

test('cart: remove only removes the chosen line', () => {
  const items = [line(), line({ size: 9 })]
  assert.deepEqual(removeLine(items, cartKey(line())).map((i) => i.size), [9])
})

test('cart: merging keeps the LARGER quantity for a shared line and keeps lines from both', () => {
  const guest = [line({ quantity: 2 }), line({ size: 9, quantity: 1 })]
  const saved = [line({ quantity: 5 }), line({ size: 10, quantity: 1 })]
  const merged = mergeCarts(guest, saved)
  assert.equal(merged.length, 3)
  assert.equal(merged.find((i) => i.size === 8).quantity, 5)
  // merging a bag with a copy of itself must not double it
  assert.ok(sameCart(mergeCarts(saved, saved), saved))
})

test('cart: sanitize drops unknown shoes, colours and sizes, fixes quantities, merges duplicates', () => {
  const clean = sanitizeCart(
    [
      line({ quantity: 3 }),
      line({ quantity: 7 }), // duplicate of the first
      line({ productId: 'sv-999' }), // no such shoe
      line({ colorId: 'pink' }), // no such colour
      line({ size: 99 }), // no such size
      line({ size: 9, quantity: 500 }), // too many
      line({ size: 7, quantity: -2 }), // nonsense quantity
      null,
      'text',
    ],
    products,
  )
  assert.equal(clean.length, 3)
  assert.equal(clean.find((i) => i.size === 8).quantity, 7)
  assert.equal(clean.find((i) => i.size === 9).quantity, MAX_QUANTITY_PER_LINE)
  assert.equal(clean.find((i) => i.size === 7).quantity, 1)
  assert.deepEqual(sanitizeCart('nope', products), [])
  assert.deepEqual(sanitizeCart(undefined, products), [])
})

test('cart: sanitize keeps the line limit', () => {
  const product = products[0]
  const many = product.availableColors.flatMap((c) => product.availableSizes.map((size) => ({ productId: product.id, colorId: c.id, size, quantity: 1 })))
  assert.ok(sanitizeCart(many, products).length <= MAX_CART_LINES)
})

test('cart: lines get details from the catalogue and a stock status', () => {
  // sv-001 black: size 8 has 6, size 10 has 0
  const [ok, soldOut, low] = resolveLines(
    [line({ quantity: 2 }), line({ size: 10 }), line({ size: 11, quantity: 3 })],
    products,
  )
  assert.equal(ok.name, 'Aero Runner 01')
  assert.equal(ok.unitPrice, 6999)
  assert.equal(ok.lineTotal, 13998)
  assert.equal(ok.colorLabel, 'Core Black')
  assert.equal(ok.status, 'ok')
  assert.equal(soldOut.status, 'sold_out')
  assert.equal(low.status, 'low_stock') // stock 1, asked for 3
  assert.deepEqual(resolveLines([line({ productId: 'gone' })], products), [])
})

test('cart: totals = subtotal + flat Rs 99 delivery, empty bag has no delivery fee', () => {
  const lines = resolveLines([line({ quantity: 2 }), line({ productId: 'sv-003', colorId: 'red', size: 9 })], products)
  const totals = computeTotals(lines)
  assert.equal(totals.subtotal, 6999 * 2 + 7999)
  assert.equal(totals.deliveryFee, DELIVERY_FEE_INR)
  assert.equal(DELIVERY_FEE_INR, 99)
  assert.equal(totals.total, totals.subtotal + 99)
  assert.equal(totals.itemCount, 3)
  assert.deepEqual(computeTotals([]), { subtotal: 0, deliveryFee: 0, total: 0, itemCount: 0 })
})

test('cart: what is sent to the database never contains a price', () => {
  const rpc = toRpcItems([line({ quantity: 2 })])
  assert.deepEqual(rpc, [{ product_id: 'sv-001', color_id: 'black', size: 8, quantity: 2 }])
  assert.deepEqual(Object.keys(rpc[0]).sort(), ['color_id', 'product_id', 'quantity', 'size'])
})

test('cart: server rows round-trip and counts add up', () => {
  const items = [line({ quantity: 2 }), line({ size: 9, quantity: 3 })]
  assert.deepEqual(fromServerRows(toRpcItems(items)), items)
  assert.deepEqual(fromServerRows(null), [])
  assert.equal(countItems(items), 5)
})
