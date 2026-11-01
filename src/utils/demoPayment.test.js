import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import {
  DEMO_CARD_FAILURE_NUMBER,
  DEMO_CARD_SUCCESS_NUMBER,
  DEMO_PAYMENT_DURATION_MS,
  demoCardOutcome,
  getDemoSessionAttempt,
  makeDemoQrPayload,
  remainingDemoSessionMs,
  runDemoPaymentSimulation,
  saveDemoSessionAttempt,
  validateDemoCard,
} from './demoPayment.js'
import {
  createDemoPaymentSessionWithClient,
  finishDemoPaymentSessionWithClient,
  placeOrderWithClient,
} from '../services/orderService.js'
import { paymentMethodLabel, paymentStatusLabel } from './paymentDisplay.js'
import { friendlyOrderError } from './orderErrors.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sessionKey = '11111111-1111-4111-8111-111111111111'
const orderKey = '22222222-2222-4222-8222-222222222222'
const sessionId = '33333333-3333-4333-8333-333333333333'
const createdAt = '2026-01-01T00:00:00.000Z'
const expiresAt = '2026-01-01T00:03:00.000Z'
const serverNow = '2026-01-01T00:00:00.000Z'
const checkoutItems = [{ productId: 'sv-001', colorId: 'black', size: 8, quantity: 1 }]
const shipping = { full_name: 'Asha Rao', phone: '9876543210', pin_code: '560001' }
const pendingSession = {
  id: sessionId,
  session_reference: 'DP-0123456789AB',
  order_reference: 'SV-1A2B3C4D',
  demo_method: 'demo_upi',
  amount_inr: 7099,
  status: 'pending',
  created_at: createdAt,
  expires_at: expiresAt,
  server_now: serverNow,
}

function fakeStore() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('demo UPI QR is dynamically generated from an explicitly non-payment payload', async () => {
  const payload = makeDemoQrPayload(pendingSession)
  assert.match(payload, /SOLEVERSE_DEMO_PAYMENT/)
  assert.match(payload, /simulation_only=true/)
  assert.match(payload, /not_a_upi_payment_request=true/)
  assert.match(payload, /amount_inr=7099/)
  assert.doesNotMatch(payload, /^upi:\/\//i)
  assert.match(await QRCode.toDataURL(payload), /^data:image\/png;base64,/)
})

test('demo session countdown uses database time and does not restart after refresh', () => {
  assert.equal(DEMO_PAYMENT_DURATION_MS, 180_000)
  const session = { ...pendingSession, received_at_client: 1000 }
  assert.equal(remainingDemoSessionMs(session, 61_000), 120_000)
  assert.equal(remainingDemoSessionMs(session, 181_001), 0)

  const storage = fakeStore()
  const attempt = { sessionKey, orderKey, method: 'demo_upi', fingerprint: 'checkout-fingerprint' }
  saveDemoSessionAttempt(attempt, storage)
  assert.deepEqual(getDemoSessionAttempt(storage), attempt)
  assert.equal(remainingDemoSessionMs({ ...pendingSession, received_at_client: 10_000 }, 10_000), 180_000)
  assert.equal(remainingDemoSessionMs({ ...pendingSession, received_at_client: 10_000 }, 70_000), 120_000)
})

test('demo card accepts only published mock numbers and returns a simple result', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const valid = { name: 'Demo User', expiry: '12/30', cvv: '123' }
  assert.deepEqual(validateDemoCard({ ...valid, number: DEMO_CARD_SUCCESS_NUMBER }, now), {})
  assert.deepEqual(validateDemoCard({ ...valid, number: DEMO_CARD_FAILURE_NUMBER }, now), {})
  assert.ok(validateDemoCard({ ...valid, number: '4111111111111111' }, now).number)
  assert.equal(demoCardOutcome(DEMO_CARD_SUCCESS_NUMBER), 'success')
  assert.equal(demoCardOutcome(DEMO_CARD_FAILURE_NUMBER), 'failure')
})

test('session creation is RPC-backed, reuses the same idempotency keys, and sends no prices', async () => {
  const calls = []
  const client = {
    async rpc(name, args) {
      calls.push({ name, args })
      return { data: pendingSession, error: null }
    },
  }
  const params = { sessionKey, orderKey, items: checkoutItems, shipping, paymentMethod: 'demo_upi' }
  const first = await createDemoPaymentSessionWithClient(client, params)
  const refresh = await createDemoPaymentSessionWithClient(client, params)

  assert.equal(first.data.id, sessionId)
  assert.equal(refresh.data.session_reference, first.data.session_reference)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], calls[1])
  assert.equal(calls[0].name, 'create_demo_payment_session')
  assert.deepEqual(calls[0].args, {
    p_session_key: sessionKey,
    p_order_idempotency_key: orderKey,
    p_items: [{ product_id: 'sv-001', color_id: 'black', size: 8, quantity: 1 }],
    p_shipping: shipping,
    p_demo_method: 'demo_upi',
  })
  assert.equal(Object.hasOwn(calls[0].args, 'price'), false)
})

test('demo success is database-confirmed and idempotent; failure stays unpaid', async () => {
  const completedResponse = {
      status: 'completed',
      order_id: '44444444-4444-4444-8444-444444444444',
      order_reference: 'SV-1A2B3C4D',
      session_reference: pendingSession.session_reference,
      transaction_reference: 'DEMO-0123456789ABCDEF',
      transaction_at: '2026-01-01T00:01:00Z',
      amount_inr: 7099,
      demo_method: 'demo_card',
      reused: false,
      server_now: '2026-01-01T00:01:00Z',
  }
  const responses = [
    completedResponse,
    { ...completedResponse, reused: true },
    {
      status: 'failed',
      session_reference: pendingSession.session_reference,
      transaction_reference: 'DEMO-FEDCBA9876543210',
      transaction_at: '2026-01-01T00:01:00Z',
      amount_inr: 7099,
      demo_method: 'demo_card',
      reused: false,
      server_now: '2026-01-01T00:01:00Z',
    },
  ]
  const calls = []
  const client = {
    async rpc(name, args) {
      calls.push({ name, args })
      return { data: responses.shift(), error: null }
    },
  }
  const succeeded = await finishDemoPaymentSessionWithClient(client, { sessionId, result: 'success' })
  const retry = await finishDemoPaymentSessionWithClient(client, { sessionId, result: 'success' })
  const failed = await finishDemoPaymentSessionWithClient(client, { sessionId, result: 'failure' })

  assert.equal(succeeded.data.status, 'completed')
  assert.equal(succeeded.data.reference, 'SV-1A2B3C4D')
  assert.equal(succeeded.data.receipt.status, 'completed')
  assert.equal(retry.data.status, 'completed')
  assert.equal(retry.data.reused, true)
  assert.equal(failed.data.status, 'failed')
  assert.equal(failed.data.reference, undefined)
  assert.equal(calls[0].name, 'finish_demo_payment_session')
  assert.deepEqual(calls[0].args, { p_session_id: sessionId, p_result: 'success' })
  assert.deepEqual(calls[1].args, { p_session_id: sessionId, p_result: 'success' })
  assert.deepEqual(calls[2].args, { p_session_id: sessionId, p_result: 'failure' })
})

test('expired, missing-RPC and network failures never return a successful demo order', async () => {
  const expired = await finishDemoPaymentSessionWithClient({
    async rpc() {
      return {
        data: {
          status: 'expired', session_reference: pendingSession.session_reference,
          amount_inr: 7099, demo_method: 'demo_upi', server_now: '2026-01-01T00:04:00Z',
        },
        error: null,
      }
    },
  }, { sessionId, result: 'success' })
  const missing = await createDemoPaymentSessionWithClient({
    async rpc() {
      return { data: null, error: { code: 'PGRST202', message: 'create_demo_payment_session missing' } }
    },
  }, { sessionKey, orderKey, items: checkoutItems, shipping, paymentMethod: 'demo_upi' })
  const network = await finishDemoPaymentSessionWithClient({
    async rpc() {
      throw new TypeError('Failed to fetch')
    },
  }, { sessionId, result: 'success' })

  assert.equal(expired.data.status, 'expired')
  assert.equal(expired.data.reference, undefined)
  assert.equal(missing.data, null)
  assert.equal(missing.error.kind, 'setup')
  assert.equal(network.data, null)
  assert.equal(network.error.kind, 'network')
  assert.equal(friendlyOrderError({ message: 'demo_payment_amount_or_stock_changed' }).kind, 'stock')
})

test('simulation retries pass only an outcome; card inputs are absent from every payment RPC', async () => {
  const called = []
  await runDemoPaymentSimulation('success', async (...args) => called.push(args), async () => {})
  assert.deepEqual(called, [['success']])

  const service = fs.readFileSync(path.join(root, 'src/services/orderService.js'), 'utf8')
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261027000200_demo_payment_sessions.sql'), 'utf8')
  for (const secret of [DEMO_CARD_SUCCESS_NUMBER, DEMO_CARD_FAILURE_NUMBER]) {
    assert.doesNotMatch(service, new RegExp(secret))
    assert.doesNotMatch(migration, new RegExp(secret))
  }
  assert.doesNotMatch(migration, /card_number|card_cvv|upi_pin/i)
  assert.match(migration, /items_snapshot jsonb/i)
  assert.match(migration, /shipping_snapshot jsonb/i)
  assert.match(migration, /session\.expires_at <= clock_timestamp\(\)/i)
  assert.match(migration, /orders_require_demo_payment_session/)
  assert.match(migration, /grant select on table public\.demo_payment_sessions to authenticated/i)
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all)\s+on\s+table public\.demo_payment_sessions to authenticated/i)
})

test('COD remains on the original order RPC and migration order is documented', async () => {
  let called
  await placeOrderWithClient({
    async rpc(name, args) {
      called = { name, args }
      return {
        data: {
          order_id: '55555555-5555-4555-8555-555555555555',
          reference: 'SV-ABCDEF12', total_inr: 7099, reused: false,
        },
        error: null,
      }
    },
  }, {
    idempotencyKey: orderKey, items: checkoutItems, shipping, paymentMethod: 'cod',
  })
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
  assert.equal(called.name, 'place_order')
  assert.equal(called.args.p_payment_method, 'cod')
  assert.equal(paymentMethodLabel({ payment_method: 'cod' }), 'Cash on Delivery (COD)')
  assert.match(paymentStatusLabel({ payment_method: 'cod', payment_status: 'due_on_delivery' }), /COD pending/)
  assert.match(paymentStatusLabel({ payment_method: 'simulated_online', payment_status: 'simulated' }), /No payment received/)
  assert.ok(readme.indexOf('20261027000100_demo_payment_methods.sql') < readme.indexOf('20261027000200_demo_payment_sessions.sql'))
  assert.match(readme, /Neither SQL file is applied by the app/)
})
