import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatPrice } from './formatPrice.js'
import { resolveAdminAccess } from './adminAccess.js'
import {
  buildSalesSeries,
  calculateInventoryCounts,
  calculateOrderStatusCounts,
  countOrdersToday,
  getDateInTimeZone,
  rankTopSellingProducts,
  resolveAdminRequest,
  startDashboardRefresh,
} from './adminDashboard.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('INR values use the Indian grouping style', () => {
  assert.equal(formatPrice(0), '₹0')
  assert.equal(formatPrice(1234567), '₹12,34,567')
})

test('India-local order date handles midnight boundaries', () => {
  const beforeMidnight = new Date('2026-10-31T18:29:59.999Z')
  const midnight = new Date('2026-10-31T18:30:00.000Z')
  assert.equal(getDateInTimeZone(beforeMidnight), '2026-10-31')
  assert.equal(getDateInTimeZone(midnight), '2026-11-01')
  assert.equal(countOrdersToday([
    { created_at: '2026-10-31T18:29:59.999Z' },
    { created_at: '2026-10-31T18:30:00.000Z' },
    { created_at: '2026-11-01T18:29:59.999Z' },
  ], midnight), 2)
})

test('inventory counts use actual variant stock and the configured five-pair cutoff', () => {
  assert.deepEqual(calculateInventoryCounts([
    { stock: 0 },
    { stock: 1 },
    { stock: 5 },
    { stock: 6 },
  ]), { in_stock: 1, low_stock: 2, out_of_stock: 1 })
  assert.deepEqual(calculateInventoryCounts([]), { in_stock: 0, low_stock: 0, out_of_stock: 0 })
})

test('top-selling products rank by units then value and have no sample fallback', () => {
  assert.deepEqual(rankTopSellingProducts([
    { product_id: 'a', units_sold: 2, sales_value_inr: 100 },
    { product_id: 'b', units_sold: 5, sales_value_inr: 50 },
    { product_id: 'c', units_sold: 5, sales_value_inr: 70 },
    { product_id: 'never-sold', units_sold: 0, sales_value_inr: 0 },
  ]).map(({ product_id }) => product_id), ['c', 'b', 'a'])
  assert.deepEqual(rankTopSellingProducts([]), [])
})

test('order status counts combine existing delivery states and calculate percentages', () => {
  const statuses = calculateOrderStatusCounts([
    { status: 'placed', count: 1 },
    { status: 'processing', count: 1 },
    { status: 'shipped', count: 1 },
    { status: 'out_for_delivery', count: 1 },
    { status: 'delivered', count: 1 },
    { status: 'completed', count: 1 },
    { status: 'cancelled', count: 1 },
  ])
  assert.deepEqual(statuses.map(({ key, count }) => [key, count]), [
    ['placed', 1],
    ['processing', 1],
    ['in_transit', 2],
    ['delivered', 2],
    ['cancelled', 1],
  ])
  assert.ok(Math.abs(statuses[0].percentage - (100 / 7)) < 0.0001)
  assert.ok(Math.abs(statuses[2].percentage - (200 / 7)) < 0.0001)
  assert.equal(calculateOrderStatusCounts([]).every(({ count, percentage }) => count === 0 && percentage === 0), true)
})

test('sales series groups India-local dates into daily, Monday-based weekly and calendar months', () => {
  const now = new Date('2026-11-01T18:30:00.000Z')
  const data = [
    { date: '2026-10-26', amount_inr: 10 },
    { date: '2026-10-31', amount_inr: 20 },
    { date: '2026-11-01', amount_inr: 30 },
  ]
  const daily = buildSalesSeries(data, 'daily', now)
  assert.equal(daily.length, 7)
  assert.equal(daily.at(-2).key, '2026-11-01')
  assert.equal(daily.at(-2).amount_inr, 30)

  const weekly = buildSalesSeries(data, 'weekly', now)
  assert.equal(weekly.length, 8)
  assert.equal(weekly.at(-2).key, '2026-10-26')
  assert.equal(weekly.at(-2).amount_inr, 60)

  const monthly = buildSalesSeries(data, 'monthly', now)
  assert.equal(monthly.length, 12)
  assert.equal(monthly.at(-2).amount_inr, 30)
  assert.equal(monthly.at(-1).amount_inr, 30)
  assert.equal(buildSalesSeries([], 'daily', now).every(({ amount_inr }) => amount_inr === 0), true)
})

function createEventTarget() {
  const listeners = new Map()
  return {
    visibilityState: 'visible',
    intervalCallback: null,
    intervalMs: null,
    cleared: false,
    addEventListener(name, callback) {
      listeners.set(name, callback)
    },
    removeEventListener(name, callback) {
      if (listeners.get(name) === callback) listeners.delete(name)
    },
    dispatch(name) {
      listeners.get(name)?.()
    },
    setInterval(callback, intervalMs) {
      this.intervalCallback = callback
      this.intervalMs = intervalMs
      return 1
    },
    clearInterval(id) {
      assert.equal(id, 1)
      this.cleared = true
    },
    tick() {
      this.intervalCallback?.()
    },
    hasListener(name) {
      return listeners.has(name)
    },
  }
}

test('dashboard refresh updates on schedule and focus, avoids overlap, and cleans up listeners', async () => {
  const windowTarget = createEventTarget()
  const documentTarget = createEventTarget()
  let releaseRefresh
  let refreshCount = 0
  const refresh = () => {
    refreshCount += 1
    return new Promise((resolve) => { releaseRefresh = resolve })
  }
  const stop = startDashboardRefresh(refresh, { intervalMs: 30_000, windowTarget, documentTarget })

  assert.equal(windowTarget.intervalMs, 30_000)
  windowTarget.tick()
  windowTarget.dispatch('focus')
  assert.equal(refreshCount, 1)
  releaseRefresh()
  await new Promise((resolve) => setImmediate(resolve))

  documentTarget.dispatch('visibilitychange')
  assert.equal(refreshCount, 2)
  releaseRefresh()
  await new Promise((resolve) => setImmediate(resolve))

  stop()
  assert.equal(windowTarget.cleared, true)
  assert.equal(windowTarget.hasListener('focus'), false)
  assert.equal(documentTarget.hasListener('visibilitychange'), false)
  windowTarget.tick()
  assert.equal(refreshCount, 2)
})

test('database request failures return explicit errors without success-shaped data', async () => {
  const databaseError = await resolveAdminRequest(Promise.resolve({ data: null, error: new Error('denied') }))
  assert.equal(databaseError.data, null)
  assert.match(databaseError.error, /required Supabase migrations and your administrator access/)

  const connectionError = await resolveAdminRequest(Promise.reject(new Error('offline')))
  assert.equal(connectionError.data, null)
  assert.match(connectionError.error, /connection and administrator access/)
})

test('database analytics and admin route preserve server-side administrator authorization', () => {
  const migration = read('supabase/migrations/20261031000100_admin_dashboard_analytics.sql')
  const route = read('src/components/admin/AdminRoute.jsx')
  const service = read('src/services/adminService.js')
  assert.equal(resolveAdminAccess(true, null), 'allowed')
  assert.equal(resolveAdminAccess(false, null), 'denied')
  assert.equal(resolveAdminAccess(null, new Error('request failed')), 'error')
  assert.match(migration, /if not public\.is_soleverse_admin\(\) then/)
  assert.match(migration, /revoke all on function public\.soleverse_admin_dashboard\(\) from public, anon/)
  assert.match(service, /rpc\('soleverse_admin_dashboard'\)/)
  assert.match(route, /access\.status === 'denied'/)
  assert.match(route, /verifyAdminAccess\(\)/)
})

test('analytics RPC uses known order/product schema and returns safe empty aggregates', () => {
  const migration = read('supabase/migrations/20261031000100_admin_dashboard_analytics.sql')
  assert.match(migration, /public\.orders/)
  assert.match(migration, /public\.order_items/)
  assert.match(migration, /public\.products/)
  assert.match(migration, /public\.product_variants/)
  assert.match(migration, /public\.product_images/)
  assert.match(migration, /public\.profiles/)
  assert.match(migration, /o\.status <> 'cancelled'/)
  assert.match(migration, /sum\(i\.quantity\)/)
  assert.match(migration, /sum\(i\.line_total_inr\)/)
  assert.match(migration, /at time zone 'Asia\/Kolkata'/)
  assert.match(migration, /'\[\]'::jsonb/)
})
