import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizePhone, toShippingPayload, validateCity, validateFullName, validateLandmark,
  validatePhone, validatePinCode, validateShipping, validateState, validateStreet,
} from './checkoutValidation.js'
import { clearAttemptKey, fingerprint, getAttemptKey, newKey } from './checkoutAttempt.js'
import { friendlyOrderError } from './orderErrors.js'
import { placeOrderWithClient } from '../services/orderService.js'
import { INDIAN_STATES } from '../data/indianStates.js'
import { PAYMENT_METHODS } from '../data/checkoutConfig.js'
import { SIMULATED_PAYMENT_NOTICE } from './demoPayment.js'
import { paymentMethodLabel, paymentStatusLabel } from './paymentDisplay.js'

const good = {
  fullName: 'Asha Rao', phone: '98765 43210', pinCode: '560001', state: 'Karnataka',
  city: 'Bengaluru', street: '12 MG Road, Flat 4', landmark: '',
}

test('checkout: a complete address passes and the landmark is optional', () => {
  assert.deepEqual(validateShipping(good), {})
  assert.equal(validateLandmark(''), '')
  assert.equal(validateLandmark('Near the metro'), '')
  assert.notEqual(validateLandmark('x'.repeat(101)), '')
})

test('checkout: every required field reports a problem when empty', () => {
  const errors = validateShipping({ fullName: '', phone: '', pinCode: '', state: '', city: '', street: '', landmark: '' })
  assert.deepEqual(Object.keys(errors).sort(), ['city', 'fullName', 'phone', 'pinCode', 'state', 'street'])
})

test('checkout: phone numbers are tidied, then must be 10-digit Indian mobiles', () => {
  assert.equal(normalizePhone('+91 98765-43210'), '9876543210')
  assert.equal(normalizePhone('09876543210'), '9876543210')
  assert.equal(normalizePhone('919876543210'), '9876543210')
  assert.equal(validatePhone('9876543210'), '')
  assert.notEqual(validatePhone('1234567890'), '') // must start 6-9
  assert.notEqual(validatePhone('98765'), '')
  assert.notEqual(validatePhone('98765432101'), '')
  assert.notEqual(validatePhone('abcdefghij'), '')
})

test('checkout: PIN codes are 6 digits and never start with 0', () => {
  assert.equal(validatePinCode('560001'), '')
  for (const bad of ['060001', '56001', '5600011', '56 0001', 'abcdef', '']) assert.notEqual(validatePinCode(bad), '', bad)
})

test('checkout: state must come from the list; city, street and name have sensible limits', () => {
  assert.equal(validateState('Tamil Nadu'), '')
  assert.notEqual(validateState('Narnia'), '')
  assert.notEqual(validateState(''), '')
  assert.notEqual(validateCity('A'), '')
  assert.notEqual(validateStreet('1'), '')
  assert.notEqual(validateStreet('x'.repeat(201)), '')
  assert.notEqual(validateFullName('A'), '')
  assert.notEqual(validateFullName('   '), '')
  assert.equal(validateFullName('  Asha   Rao '), '')
})

test('checkout: the payload is tidied and has exactly the fields the database reads', () => {
  const payload = toShippingPayload({ ...good, fullName: '  Asha   Rao ', landmark: '  near   park ' })
  assert.deepEqual(payload, {
    full_name: 'Asha Rao', phone: '9876543210', pin_code: '560001', state: 'Karnataka',
    city: 'Bengaluru', street: '12 MG Road, Flat 4', landmark: 'near park',
  })
})

test('checkout: payment options identify simulated UPI/card methods without implying real payments', () => {
  assert.deepEqual(PAYMENT_METHODS.map((m) => m.id), ['cod', 'demo_upi', 'demo_card'])
  const online = PAYMENT_METHODS.filter((m) => m.simulated)
  assert.equal(online.length, 2)
  assert.equal(online[0].label, 'UPI QR')
  assert.equal(online[1].label, 'Credit/Debit Card')
  assert.match(online[0].description, /no UPI app, PIN, or bank account/i)
  assert.match(online[1].description, /never enter real card details/i)
  assert.doesNotMatch(online[0].label + online[1].label, /demo/i)
  assert.doesNotMatch(SIMULATED_PAYMENT_NOTICE, /demo/i)
  assert.match(SIMULATED_PAYMENT_NOTICE, /No real money will be charged/)
  assert.equal(paymentMethodLabel({ payment_method: 'simulated_online', demo_payment_method: 'demo_upi' }), 'UPI QR')
  assert.equal(paymentStatusLabel({ payment_method: 'simulated_online', payment_status: 'simulated' }), 'No payment received')
  assert.equal(PAYMENT_METHODS.find((m) => m.id === 'cod').simulated, false)
})

test('checkout: the browser state list matches the one inside the SQL function exactly', () => {
  const sql = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/20261013000200_create_orders.sql'),
    'utf8',
  )
  const block = sql.match(/states constant text\[\] := array\[([\s\S]*?)\];/)[1]
  const sqlStates = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])
  assert.deepEqual([...sqlStates].sort(), [...INDIAN_STATES].sort())
  assert.equal(new Set(INDIAN_STATES).size, INDIAN_STATES.length)
})

test('saved delivery fields extend the existing profile table without replacing its security model', () => {
  const migration = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/20261024000000_profile_delivery_address.sql'),
    'utf8',
  )
  assert.match(migration, /alter table public\.profiles/i)
  for (const column of ['pin_code', 'state', 'city', 'street', 'landmark']) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`, 'i'))
  }
  assert.doesNotMatch(migration, /\bdrop\s+(table|policy)|disable\s+row level security/i)

  const profileService = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../services/profileService.js'),
    'utf8',
  )
  assert.match(profileService, /client\.auth\.getUser\(\)/)
  assert.match(profileService, /id:\s*userId/)
})

// ---- idempotency key ----
function fakeStore() {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) }
}
const order = { userId: 'u1', items: [{ productId: 'sv-001', colorId: 'black', size: 8, quantity: 2 }], shipping: { phone: '9' }, paymentMethod: 'cod' }

test('attempt key: same order -> same key (double click, refresh, retry); changed order -> new key', () => {
  const store = fakeStore()
  const k1 = getAttemptKey(fingerprint(order), store)
  assert.match(k1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(getAttemptKey(fingerprint(order), store), k1)
  const changed = { ...order, paymentMethod: 'simulated_online' }
  const k2 = getAttemptKey(fingerprint(changed), store)
  assert.notEqual(k2, k1)
  const moreItems = { ...order, items: [{ ...order.items[0], quantity: 3 }] }
  assert.notEqual(getAttemptKey(fingerprint(moreItems), store), k2)
})

test('attempt key: line order does not matter; clearing gives a fresh key; broken storage still works', () => {
  const a = { ...order, items: [{ productId: 'a', colorId: 'x', size: 1, quantity: 1 }, { productId: 'b', colorId: 'y', size: 2, quantity: 1 }] }
  const b = { ...order, items: [...a.items].reverse() }
  assert.equal(fingerprint(a), fingerprint(b))
  const store = fakeStore()
  const k1 = getAttemptKey(fingerprint(order), store)
  clearAttemptKey(store)
  assert.notEqual(getAttemptKey(fingerprint(order), store), k1)
  const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  assert.ok(getAttemptKey('x', broken).length === 36)
  clearAttemptKey(broken)
  assert.notEqual(newKey(), newKey())
})

const requestOrder = {
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
  items: [{ productId: 'sv-001', colorId: 'black', size: 8, quantity: 2 }],
  shipping: { full_name: 'Asha Rao', phone: '9876543210' },
  paymentMethod: 'cod',
}
const persistedOrder = {
  order_id: '22222222-2222-4222-8222-222222222222',
  reference: 'SV-1A2B3C4D',
  total_inr: 14097,
  reused: false,
}

test('checkout service: successful RPC persists and returns a validated order without client prices', async () => {
  let call
  const client = {
    async rpc(name, args) {
      call = { name, args }
      return { data: persistedOrder, error: null }
    },
  }
  const result = await placeOrderWithClient(client, requestOrder)

  assert.deepEqual(result, {
    data: { orderId: persistedOrder.order_id, reference: persistedOrder.reference, totalInr: 14097, reused: false },
    error: null,
  })
  assert.equal(call.name, 'place_order')
  assert.deepEqual(call.args, {
    p_idempotency_key: requestOrder.idempotencyKey,
    p_items: [{ product_id: 'sv-001', color_id: 'black', size: 8, quantity: 2 }],
    p_shipping: requestOrder.shipping,
    p_payment_method: 'cod',
  })
})

test('checkout service: missing database RPC objects report setup and never return an order', async () => {
  const client = {
    async rpc() {
      return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.place_order' } }
    },
  }
  const result = await placeOrderWithClient(client, requestOrder)

  assert.equal(result.data, null)
  assert.equal(result.error.kind, 'setup')
  assert.match(result.error.message, /three Phase 6 SQL files/)
})

test('checkout setup error identifies the missing delivered_at migration', () => {
  const service = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../services/orderService.js'),
    'utf8',
  )
  const migration = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/20261026000400_customer_delivery_confirmation.sql'),
    'utf8',
  )

  assert.match(service, /status, delivered_at, payment_method/)
  assert.match(migration, /add column if not exists delivered_at timestamptz/i)
  assert.match(
    friendlyOrderError({ code: '42703', message: 'column orders.delivered_at does not exist' }).message,
    /20261026000400_customer_delivery_confirmation\.sql/,
  )
})

test('checkout service: failed or malformed order creation cannot look successful', async () => {
  const failed = await placeOrderWithClient({
    async rpc() {
      return { data: null, error: { message: 'database unavailable' } }
    },
  }, requestOrder)
  const malformed = await placeOrderWithClient({
    async rpc() {
      return { data: { reference: 'SV-1A2B3C4D' }, error: null }
    },
  }, requestOrder)

  assert.equal(failed.data, null)
  assert.equal(failed.error.kind, 'unknown')
  assert.equal(malformed.data, null)
  assert.match(malformed.error.message, /couldn't confirm that your order was saved/)
})

test('checkout service: stock rejection is surfaced and the same retry key reuses one persisted order', async () => {
  let creationCount = 0
  const seenKeys = new Set()
  const client = {
    async rpc(_name, args) {
      if (creationCount === 0) {
        creationCount += 1
        return { data: null, error: { message: 'insufficient_stock' } }
      }
      if (!seenKeys.has(args.p_idempotency_key)) {
        seenKeys.add(args.p_idempotency_key)
        creationCount += 1
        return { data: persistedOrder, error: null }
      }
      return { data: { ...persistedOrder, reused: true }, error: null }
    },
  }
  const stockFailure = await placeOrderWithClient(client, requestOrder)
  const firstTry = await placeOrderWithClient(client, requestOrder)
  const retry = await placeOrderWithClient(client, requestOrder)

  assert.equal(stockFailure.error.kind, 'stock')
  assert.equal(stockFailure.data, null)
  assert.equal(firstTry.data.reused, false)
  assert.equal(retry.data.reused, true)
  assert.equal(creationCount, 2)
})

// ---- friendly errors ----
test('order errors: each database error becomes a calm, useful sentence', () => {
  assert.equal(friendlyOrderError({ message: 'insufficient_stock', details: 'sv-001' }).kind, 'stock')
  assert.equal(friendlyOrderError({ message: 'item_unavailable' }).kind, 'stock')
  assert.equal(friendlyOrderError({ message: 'not_authenticated' }).kind, 'login')
  assert.equal(friendlyOrderError({ message: 'JWT expired', code: 'PGRST301' }).kind, 'login')
  assert.equal(friendlyOrderError({ message: 'empty_cart' }).kind, 'empty')
  const shipping = friendlyOrderError({ message: 'invalid_shipping', details: 'pin_code' })
  assert.equal(shipping.kind, 'invalid_shipping')
  assert.equal(shipping.field, 'pinCode')
  assert.match(shipping.message, /PIN code/)
  assert.equal(friendlyOrderError({ code: 'PGRST202', message: 'Could not find the function public.place_order' }).kind, 'setup')
  assert.match(friendlyOrderError({ code: 'PGRST202', message: 'Could not find create_demo_payment_session' }).message, /Payment options are not set up/i)
  assert.equal(friendlyOrderError({ code: '42P01', message: 'relation "orders" does not exist' }).kind, 'setup')
  assert.equal(friendlyOrderError(new TypeError('Failed to fetch')).kind, 'network')
  assert.equal(friendlyOrderError({ message: 'something odd' }).kind, 'unknown')
  assert.equal(friendlyOrderError(null).kind, 'unknown')
  // never leaks raw database text to the shopper
  assert.doesNotMatch(friendlyOrderError({ message: 'duplicate key value violates unique constraint "orders_pkey"' }).message, /duplicate key|orders_pkey/)
})

test('confirmation page only presents success after reading the persisted order', () => {
  const page = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../pages/OrderConfirmation.jsx'),
    'utf8',
  )
  assert.match(page, /state\.status === 'ready' && \([\s\S]*?<p className="eyebrow mt-6 text-muted">Order placed<\/p>/)
  assert.match(page, /state\.status === 'loading' &&[\s\S]*?Checking that your order was saved/)
  assert.match(page, /state\.status === 'error' \|\| state\.status === 'missing'/)
})
