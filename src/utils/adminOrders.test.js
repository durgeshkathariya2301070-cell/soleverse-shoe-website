import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORDER_STATUSES } from './orderTracking.js'
import {
  ADMIN_ORDER_FILTERS,
  createOrderActionLock,
  filterAdminOrders,
  getAdminOrderFilterKey,
  paginateAdminOrders,
} from './adminOrders.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const orders = [
  { id: '1', reference: 'SV-PENDING1', status: 'placed', customer_name: 'Asha Rao', customer_email: 'asha@example.test', phone: '9000000001' },
  { id: '2', reference: 'SV-PROCESS1', status: 'processing', customer_name: 'Ben Shah', customer_email: 'ben@example.test', phone: '9000000002' },
  { id: '3', reference: 'SV-SHIPPED1', status: 'shipped', customer_name: 'Cora Das', customer_email: 'cora@example.test', phone: '9000000003' },
  { id: '4', reference: 'SV-DELIVER1', status: 'delivered', customer_name: 'Dev Rai', customer_email: 'dev@example.test', phone: '9000000004' },
  { id: '5', reference: 'SV-LEGACY1', status: 'completed', customer_name: 'Esha Gill', customer_email: 'esha@example.test', phone: '9000000005' },
  { id: '6', reference: 'SV-CANCEL1', status: 'cancelled', customer_name: 'Farah Sen', customer_email: 'farah@example.test', phone: '9000000006' },
  { id: '7', reference: 'SV-OUTDELIV', status: 'out_for_delivery', customer_name: 'Gita Roy', customer_email: 'gita@example.test', phone: '9000000007' },
]

test('admin order filters cover every supported database status and omit unsupported returned status', () => {
  assert.deepEqual(ORDER_STATUSES, [
    'placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled',
  ])
  assert.deepEqual(ADMIN_ORDER_FILTERS.map(({ key }) => key), [
    'all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled',
  ])
  assert.equal(getAdminOrderFilterKey('returned'), null)
  assert.deepEqual(filterAdminOrders(orders, 'pending').map(({ id }) => id), ['1'])
  assert.deepEqual(filterAdminOrders(orders, 'processing').map(({ id }) => id), ['2'])
  assert.deepEqual(filterAdminOrders(orders, 'shipped').map(({ id }) => id), ['3', '7'])
  assert.deepEqual(filterAdminOrders(orders, 'delivered').map(({ id }) => id), ['4', '5'])
  assert.deepEqual(filterAdminOrders(orders, 'cancelled').map(({ id }) => id), ['6'])
  assert.deepEqual(filterAdminOrders(orders, 'all'), orders)
})

test('admin order search combines with status and matches reference or customer fields case-insensitively', () => {
  assert.deepEqual(filterAdminOrders(orders, 'all', 'sv-cancel').map(({ id }) => id), ['6'])
  assert.deepEqual(filterAdminOrders(orders, 'pending', 'ASHA@EXAMPLE.TEST').map(({ id }) => id), ['1'])
  assert.deepEqual(filterAdminOrders(orders, 'processing', '9000000002').map(({ id }) => id), ['2'])
  assert.deepEqual(filterAdminOrders(orders, 'cancelled', 'ben').map(({ id }) => id), [])
  assert.deepEqual(filterAdminOrders(orders, 'all', 'no match'), [])
})

test('admin order pagination clamps invalid pages and reports matching record ranges', () => {
  const manyOrders = Array.from({ length: 60 }, (_, index) => ({ id: String(index) }))
  const secondPage = paginateAdminOrders(manyOrders, 2)
  assert.equal(secondPage.currentPage, 2)
  assert.equal(secondPage.pageCount, 3)
  assert.equal(secondPage.start, 25)
  assert.equal(secondPage.end, 50)
  assert.equal(secondPage.items.length, 25)
  assert.equal(paginateAdminOrders(manyOrders, 100).currentPage, 3)
  assert.equal(paginateAdminOrders([], 2).end, 0)
})

test('order action lock blocks duplicate in-flight confirmations and releases for retry', () => {
  const lock = createOrderActionLock()
  assert.equal(lock.acquire(), true)
  assert.equal(lock.acquire(), false)
  lock.release()
  assert.equal(lock.acquire(), true)
  lock.release()
})

test('pending confirmation requires explicit confirmation and uses existing admin RPC without payment updates', () => {
  const page = read('src/pages/admin/AdminOrders.jsx')
  const service = read('src/services/adminService.js')
  const migration = read('supabase/migrations/20261026000400_customer_delivery_confirmation.sql')
  assert.match(page, /order\.status !== 'placed'/)
  assert.match(page, /window\.confirm\(/)
  assert.match(page, /updateAdminOrderStatus\(order\.id, 'processing'\)/)
  assert.match(page, /actionLock\.current\.acquire\(\)/)
  assert.match(page, /disabled=\{Boolean\(pendingOrderId\)\}/)
  assert.match(page, /Payment status was not changed/)
  assert.match(service, /rpc\('soleverse_admin_update_order_status'/)
  assert.match(migration, /select status into current_status[\s\S]*from public\.orders where id = p_order_id for update/i)
  assert.match(migration, /current_status = 'placed' and p_status in \('processing', 'cancelled'\)/i)
  assert.match(migration, /if not public\.is_soleverse_admin\(\) then/)
  assert.doesNotMatch(page, /payment_status\s*[:=]/)
})

test('admin order query preserves database authorization and provides data for authorized search', () => {
  const migration = read('supabase/migrations/20261019000000_phase7_admin.sql')
  const service = read('src/services/adminService.js')
  const query = migration.match(/create or replace function public\.soleverse_admin_orders\(\)([\s\S]*?)\n\$\$;/)?.[1]
  assert.ok(query)
  assert.match(query, /if not public\.is_soleverse_admin\(\) then/)
  assert.match(query, /reference text/)
  assert.match(query, /customer_email text/)
  assert.match(query, /customer_name text/)
  assert.match(query, /phone text/)
  assert.match(query, /limit 500/)
  assert.match(service, /rpc\('soleverse_admin_orders'\)/)
  assert.match(migration, /revoke all on function public\.soleverse_admin_orders\(\) from public, anon/)
  assert.match(migration, /grant execute on function public\.soleverse_admin_orders\(\) to authenticated/)
})
