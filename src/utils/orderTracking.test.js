import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getOrderStatusLabel,
  getOrderTimeline,
  isOrderReference,
} from './orderTracking.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('order tracking: every database status has its customer-facing label', () => {
  assert.deepEqual(
    ['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'].map(getOrderStatusLabel),
    ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Delivered', 'Cancelled'],
  )
  assert.equal(getOrderStatusLabel('unexpected'), 'Status unavailable')
})

test('order tracking: delivery timeline only completes milestones through current status', () => {
  const expected = {
    placed: [true, false, false, false, false],
    processing: [true, true, false, false, false],
    shipped: [true, true, true, false, false],
    out_for_delivery: [true, true, true, true, false],
    delivered: [true, true, true, true, true],
    completed: [true, true, true, true, true],
  }

  for (const [status, completed] of Object.entries(expected)) {
    assert.deepEqual(getOrderTimeline(status).map((step) => step.completed), completed, status)
  }
})

test('delivery confirmation migration persists owner-scoped prompts and enforces server-side receipt confirmation', () => {
  const migration = read('supabase/migrations/20261026000400_customer_delivery_confirmation.sql')
  const app = read('src/main.jsx')
  const navbar = read('src/components/Navbar.jsx')
  const customer = read('src/components/orders/DeliveryConfirmationCard.jsx')
  const admin = read('src/pages/admin/AdminOrderDetail.jsx')

  assert.match(migration, /create table if not exists public\.order_delivery_confirmations/i)
  assert.match(migration, /alter table public\.order_delivery_confirmations enable row level security/i)
  assert.match(migration, /auth\.uid\(\).*customer_id|auth\.uid\(\)\) = customer_id/i)
  assert.match(migration, /create or replace function public\.soleverse_customer_respond_delivery/i)
  assert.match(migration, /where c\.id = p_notification_id[\s\S]*c\.customer_id = auth\.uid\(\)[\s\S]*o\.user_id = auth\.uid\(\)[\s\S]*for update of o/i)
  assert.match(migration, /delivery_response_already_recorded/i)
  assert.match(migration, /set status = 'delivered', delivered_at = now\(\)/i)
  assert.match(migration, /p_status not in \('processing', 'shipped', 'out_for_delivery', 'cancelled'\)/i)
  assert.match(migration, /current_status = 'out_for_delivery' and p_status = 'shipped' and latest_response is false/i)
  assert.match(migration, /current_status = 'shipped' and p_status = 'out_for_delivery'/i)
  assert.match(migration, /revoke all on table public\.order_delivery_confirmations from public, anon, authenticated/i)
  assert.match(migration, /grant select on table public\.order_delivery_confirmations to authenticated/i)
  assert.match(migration, /revoke all on function public\.soleverse_customer_respond_delivery\(uuid, boolean\) from public, anon/i)
  assert.doesNotMatch(migration, /service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}/i)
  assert.match(app, /<DeliveryNotificationProvider>/)
  assert.match(navbar, /pendingCount/)
  assert.match(customer, /Have you received your SOLEVERSE order\?/)
  assert.match(customer, /Yes, I received it/)
  assert.match(customer, /No, I haven't received it/)
  assert.match(admin, /delivery_confirmations/)
})

test('order tracking: cancelled orders never mark delivery milestones complete', () => {
  const timeline = getOrderTimeline('cancelled')
  assert.ok(timeline.every((step) => !step.completed && !step.current && step.notRecorded))
  assert.equal(getOrderStatusLabel('cancelled'), 'Cancelled')
})

test('order tracking: only valid stored order references are accepted', () => {
  assert.equal(isOrderReference('SV-1A2B3C4D'), true)
  assert.equal(isOrderReference('SV-123'), false)
  assert.equal(isOrderReference('../orders'), false)
  assert.equal(isOrderReference(undefined), false)
})

test('order tracking: customer reads use the existing owner-scoped RLS, not a supplied user ID', () => {
  const service = read('src/services/orderService.js')
  const migration = read('supabase/migrations/20261013000200_create_orders.sql')
  const checks = read('supabase/local-test/10_checks.sql')
  const historyQuery = service.match(/export async function fetchMyOrders\(\)([\s\S]*?)(?=\n})/)?.[1]

  assert.ok(historyQuery, 'customer history query exists')
  assert.match(historyQuery, /\.from\('orders'\)/)
  assert.match(historyQuery, /\.order\('created_at', \{ ascending: false \}\)/)
  assert.doesNotMatch(historyQuery, /\.eq\(['"]user_id['"]/)
  assert.match(migration, /create policy "Users can read their own orders"[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(migration, /create policy "Users can read items of their own orders"[\s\S]*?o\.user_id = \(select auth\.uid\(\)\)/)
  assert.match(checks, /owner reads own order/)
  assert.match(checks, /user B cannot read user A orders/)
  assert.match(checks, /user B cannot read user A order items/)
})

test('order tracking: pages fetch current saved status and expose loading, error, and empty states', () => {
  const app = read('src/App.jsx')
  const history = read('src/pages/MyOrders.jsx')
  const tracking = read('src/pages/OrderTracking.jsx')
  const admin = read('src/services/adminService.js')

  assert.match(app, /<Route element={<ProtectedRoute \/>}>[\s\S]*?<Route path="orders" element={<MyOrders \/>} \/>/)
  assert.match(history, /Loading your orders/)
  assert.match(history, /No orders yet/)
  assert.match(history, /state\.status === 'error'/)
  assert.match(tracking, /fetchOrderByReference\(reference\)/)
  assert.match(tracking, /Refresh status/)
  assert.match(admin, /soleverse_admin_update_order_status/)
})
