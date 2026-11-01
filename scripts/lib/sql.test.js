// Static checks on the SQL migrations. They cannot run the SQL (see supabase/local-test/run.sh for that),
// but they catch the mistakes that matter most: a table without Row Level Security, a SECURITY DEFINER
// function without a safe search_path, a forgotten grant, or a catalogue seed that drifted from the sample data.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../../src/data/products.js'
import {
  buildCatalogueExpansionSql,
  buildCatalogueImageFixSql,
  buildCatalogueTaxonomySql,
  buildSeedSql,
  injectSeed,
} from './catalogueSeed.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const sqlOf = (name) => fs.readFileSync(path.join(dir, name), 'utf8')
const all = files.map((f) => ({ f, sql: sqlOf(f) }))

test('sql: migrations exist in chronological order', () => {
  assert.deepEqual(files, [
    '20261011000000_create_profiles.sql',
    '20261013000000_create_catalogue.sql',
    '20261013000100_create_cart_items.sql',
    '20261013000200_create_orders.sql',
    '20261019000000_phase7_admin.sql',
    '20261022000000_admin_user_management.sql',
    '20261023000000_profile_phone.sql',
    '20261024000000_profile_delivery_address.sql',
    '20261024000100_expand_catalogue_to_30.sql',
    '20261024000200_catalogue_brands_sports.sql',
    '20261024000300_correct_catalogue_product_images.sql',
    '20261026000100_grant_admin_catalogue_facets.sql',
    '20261026000200_product_image_gallery.sql',
    '20261026000300_review_unverified_catalogue_products.sql',
    '20261026000400_customer_delivery_confirmation.sql',
    '20261027000100_demo_payment_methods.sql',
    '20261027000200_demo_payment_sessions.sql',
    '20261031000100_admin_dashboard_analytics.sql',
  ])
})

test('sql: demo sessions are owner-scoped, time-limited, idempotent and atomically create validated online orders', () => {
  const methods = sqlOf('20261027000100_demo_payment_methods.sql')
  const sessions = sqlOf('20261027000200_demo_payment_sessions.sql')
  assert.match(methods, /add column if not exists demo_payment_method text/i)
  assert.match(methods, /check \(demo_payment_method is null or demo_payment_method in \('demo_upi', 'demo_card'\)\)/i)
  assert.match(sessions, /create table if not exists public\.demo_payment_sessions/i)
  assert.match(sessions, /unique \(user_id, session_key\)/i)
  assert.match(sessions, /alter table public\.demo_payment_sessions enable row level security/i)
  assert.match(sessions, /using \(\(select auth\.uid\(\)\) = user_id\)/i)
  assert.match(sessions, /expires_at timestamptz not null/i)
  assert.match(sessions, /created \+ interval '3 minutes'/i)
  assert.match(sessions, /public\.quote_order\(p_items\)/i)
  assert.match(sessions, /perform pg_advisory_xact_lock/i)
  assert.match(sessions, /public\.place_order\([\s\S]*session\.items_snapshot,[\s\S]*session\.shipping_snapshot,[\s\S]*'simulated_online'/i)
  assert.match(sessions, /orders_require_demo_payment_session/)
  assert.match(sessions, /revoke all on function public\.place_demo_order/i)
  assert.match(sessions, /grant execute on function public\.finish_demo_payment_session\(uuid, text\) to authenticated/i)
  assert.match(sessions, /public\.is_soleverse_admin\(\)/i)
  assert.doesNotMatch(sessions, /\b(drop|truncate|delete from)\s+(table|public\.orders|public\.products)/i)
  assert.doesNotMatch(sessions, /service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}|card_number|card_cvv|upi_pin/i)
})

test('sql: customer delivery confirmation is owner-scoped, persistent, and cannot be bypassed by admins', () => {
  const sql = sqlOf('20261026000400_customer_delivery_confirmation.sql')
  assert.match(sql, /create table if not exists public\.order_delivery_confirmations/i)
  assert.match(sql, /unique \(order_id, attempt\)/i)
  assert.match(sql, /alter table public\.order_delivery_confirmations enable row level security/i)
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = customer_id\)/i)
  assert.match(sql, /revoke all on table public\.order_delivery_confirmations from public, anon, authenticated/i)
  assert.match(sql, /grant select on table public\.order_delivery_confirmations to authenticated/i)
  assert.match(sql, /create or replace function public\.soleverse_customer_delivery_notifications\(\)[\s\S]*?where c\.customer_id = auth\.uid\(\) and o\.user_id = auth\.uid\(\)/i)
  assert.match(sql, /create or replace function public\.soleverse_customer_respond_delivery[\s\S]*?for update of o[\s\S]*?delivery_response_already_recorded[\s\S]*?set status = 'delivered', delivered_at = now\(\)/i)
  assert.match(sql, /if p_received is null then[\s\S]*?invalid_delivery_response/i)
  assert.match(sql, /create or replace function public\.soleverse_customer_report_delivery_problem/i)
  assert.match(sql, /current_status = 'shipped' and p_status = 'out_for_delivery'/i)
  assert.match(sql, /current_status = 'out_for_delivery' and p_status = 'shipped' and latest_response is false/i)
  assert.match(sql, /p_status not in \('processing', 'shipped', 'out_for_delivery', 'cancelled'\)/i)
  assert.match(sql, /insert into public\.order_delivery_confirmations \(order_id, customer_id, attempt\)/i)
  assert.match(sql, /create or replace function public\.soleverse_admin_order_detail\(p_order_id uuid\)[\s\S]*?'delivery_confirmations'/i)
  assert.doesNotMatch(sql, /\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/i)
  assert.doesNotMatch(sql, /service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}/i)
})

test('sql: catalogue review migration only clears known sample brands and unpublishes unverified products', () => {
  const sql = sqlOf('20261026000300_review_unverified_catalogue_products.sql')
  assert.match(sql, /set brand = null/i)
  assert.match(sql, /p\.id = seed\.id[\s\S]*p\.slug = seed\.slug[\s\S]*p\.brand = seed\.unverified_brand/i)
  assert.match(sql, /set is_active = false/i)
  assert.match(sql, /not exists \(select 1 from public\.product_images/i)
  assert.match(sql, /sport = 'cricket'/i)
  assert.match(sql, /formal-dress-shoe-0[1-4]\.jpg/i)
  assert.doesNotMatch(sql, /\b(drop|truncate|delete from)\b/i)
  assert.doesNotMatch(sql, /product_variants|orders|order_items/i)
})

test('sql: gallery migration is additive, ordered, and restricts image uploads to admins', () => {
  const sql = sqlOf('20261026000200_product_image_gallery.sql')
  assert.match(sql, /create table if not exists public\.product_images/i)
  assert.match(sql, /unique \(product_id, position\)/i)
  assert.match(sql, /alter table public\.product_images enable row level security/i)
  assert.match(sql, /create policy "Admins manage product images"/i)
  assert.match(sql, /bucket_id = 'product-images'[\s\S]*public\.is_soleverse_admin\(\)/i)
  assert.match(sql, /security invoker/i)
  assert.match(sql, /product_requires_variant/i)
  assert.doesNotMatch(sql, /\b(drop|truncate)\s+table\b/i)
  assert.doesNotMatch(sql, /service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}/i)
})

test('sql: the catalogue seed is exactly what the sample data produces (no drift)', () => {
  const sql = sqlOf('20261013000000_create_catalogue.sql')
  const legacyProducts = products.filter((product) => Number(product.id.slice(3)) <= 8)
  assert.equal(injectSeed(sql, buildSeedSql(legacyProducts)), sql, 'run "npm run generate-seed" to refresh the original eight products')
})

test('sql: the additive catalogue migration exactly matches the extra products without replacing live inventory', () => {
  const sql = sqlOf('20261024000100_expand_catalogue_to_30.sql')
  assert.equal(buildCatalogueExpansionSql(products), sql, 'run "npm run generate-catalogue-expansion" to refresh the SQL')
  assert.match(sql, /on conflict \(id\) do nothing/i)
  assert.match(sql, /on conflict \(product_id, color_id, size\) do nothing/i)
  assert.doesNotMatch(sql, /\b(drop|truncate)\s+(table|public\.products|public\.product_variants)/i)
  assert.equal((sql.match(/\('sv-0(?:0[9]|[12]\d|30)'/g) ?? []).length, 154)
})

test('sql: brand and sports migration is additive, repeatable and matches the extended catalogue', () => {
  const sql = sqlOf('20261024000200_catalogue_brands_sports.sql')
  assert.equal(buildCatalogueTaxonomySql(products), sql, 'run "npm run generate-catalogue-taxonomy" to refresh the SQL')
  assert.match(sql, /add column if not exists brand text/i)
  assert.match(sql, /add column if not exists sport text/i)
  assert.match(sql, /add column if not exists style text/i)
  assert.match(sql, /category = 'sports'/i)
  assert.match(sql, /on conflict \(id\) do nothing/i)
  assert.match(sql, /on conflict \(product_id, color_id, size\) do nothing/i)
  assert.match(sql, /coalesce\(p\.brand,/i)
  assert.doesNotMatch(sql, /\b(drop|truncate)\s+(table|public\.products|public\.product_variants)/i)
})

test('sql: image correction migration is conditional and changes no inventory or order data', () => {
  const sql = sqlOf('20261024000300_correct_catalogue_product_images.sql')
  assert.equal(buildCatalogueImageFixSql(products), sql, 'run "npm run generate-catalogue-image-fixes" to refresh the SQL')
  assert.match(sql, /p\.image_url = '\/products\//i)
  assert.match(sql, /else p\.image_url/i)
  assert.match(sql, /p\.style = 'Low Dunk' then 'Skate Low'/i)
  assert.doesNotMatch(sql, /\b(drop|truncate|insert into|delete from)\b/i)
  assert.doesNotMatch(sql, /product_variants|orders|order_items/i)
})

test('sql: seed escapes quotes and covers every colour and size', () => {
  const tricky = [{ id: 'x-1', slug: 'x', name: "O'Neil Court", price: 100, availableColors: [{ id: 'a', label: "Bob's Blue" }], availableSizes: [7, 8], stockByVariant: { a: { 7: 2 } } }]
  const seed = buildSeedSql(tricky)
  assert.match(seed, /'O''Neil Court'/)
  assert.match(seed, /'a', 'Bob''s Blue', 7, 2/)
  assert.match(seed, /'a', 'Bob''s Blue', 8, 0/) // missing stock means 0
  const real = buildSeedSql(products)
  const expectedVariants = products.reduce((n, p) => n + p.availableColors.length * p.availableSizes.length, 0)
  assert.equal((real.match(/^  \('sv-\d+', '[a-z]+', '[^']+', \d+, \d+\)/gm) ?? []).length, expectedVariants)
})

test('sql: every table created has Row Level Security switched on', () => {
  for (const { f, sql } of all) {
    const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1])
    for (const table of tables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${f}: ${table} needs RLS`)
    }
  }
})

test('sql: every SECURITY DEFINER function pins an empty search_path', () => {
  for (const { f, sql } of all) {
    const functions = sql.split(/create or replace function /).slice(1)
    for (const body of functions) {
      const header = body.split(/\$\$/)[0]
      if (/security definer/i.test(header)) {
        assert.match(header, /set search_path = ''/, `${f}: a security definer function is missing search_path`)
      }
      assert.match(header, /set search_path = ''/, `${f}: every function should set search_path`)
    }
  }
})

test('sql: customers can read orders but NEVER write them; anon gets nothing private', () => {
  const orders = sqlOf('20261013000200_create_orders.sql')
  assert.match(orders, /grant select on table public\.orders to authenticated/)
  assert.doesNotMatch(orders, /grant[^;]*(insert|update|delete)[^;]*on table public\.(orders|order_items)/i)
  assert.match(orders, /revoke all on table public\.orders from anon, authenticated/)
  assert.match(orders, /revoke all on function public\.place_order\(uuid, jsonb, jsonb, text\) from public, anon/)
  assert.match(orders, /grant execute on function public\.place_order\(uuid, jsonb, jsonb, text\) to authenticated/)
  const catalogue = sqlOf('20261013000000_create_catalogue.sql')
  assert.doesNotMatch(catalogue, /grant[^;]*(insert|update|delete)[^;]*on table public\.(products|product_variants)/i)
})

test('sql: order safety rules are present (idempotency, locking, constraints, prices from the table)', () => {
  const orders = sqlOf('20261013000200_create_orders.sql')
  assert.match(orders, /unique \(user_id, idempotency_key\)/)
  assert.match(orders, /pg_advisory_xact_lock/)
  assert.match(orders, /for update of pv/)
  assert.match(orders, /check \(total_inr = subtotal_inr \+ delivery_fee_inr\)/)
  assert.match(orders, /line_total_inr = unit_price_inr \* quantity/)
  assert.match(orders, /p_payment_method not in \('cod', 'simulated_online'\)/)
  // the function takes NO price argument: prices come from public.products
  const signature = orders.match(/function public\.place_order\(([\s\S]*?)\)\s*returns/)[1]
  assert.doesNotMatch(signature, /price|total|amount/i)
  assert.match(orders, /p\.price_inr as price/)
})

test('sql: no secret keys or credentials anywhere in the migrations', () => {
  for (const { f, sql } of all) {
    assert.doesNotMatch(sql, /service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}/, `${f} must not contain keys`)
  }
})

test('sql: Phase 7 admin identity is not customer-writable and every admin RPC checks authorization', () => {
  const admin = sqlOf('20261019000000_phase7_admin.sql')
  assert.match(admin, /create table if not exists public\.soleverse_admins/)
  assert.match(admin, /revoke all on table public\.soleverse_admins from public, anon, authenticated/)
  assert.match(admin, /create or replace function public\.is_soleverse_admin\(\)/)
  for (const functionName of [
    'soleverse_admin_dashboard',
    'soleverse_admin_orders',
    'soleverse_admin_order_detail',
    'soleverse_admin_update_order_status',
  ]) {
    const functionBody = admin.split(`create or replace function public.${functionName}`)[1]?.split('$$;')[0]
    assert.ok(functionBody, `${functionName} exists`)
    assert.match(functionBody, /security definer/i)
    assert.match(functionBody, /set search_path = ''/)
    assert.match(functionBody, /is_soleverse_admin/)
  }
  assert.doesNotMatch(admin, /grant\s+(?:all|update|insert|delete)[^;]*on\s+public\.orders\s+to\s+authenticated/i)
  assert.match(admin, /invalid_order_status_transition/)
  assert.match(admin, /stock = stock \+ line\.quantity/)
})

test('sql: admin user management exposes only checked RPCs and protects the allow-list', () => {
  const management = sqlOf('20261022000000_admin_user_management.sql')
  for (const functionName of [
    'soleverse_admin_list_users',
    'soleverse_admin_search_users',
    'soleverse_admin_grant_access',
    'soleverse_admin_revoke_access',
  ]) {
    const functionBody = management.split(`create or replace function public.${functionName}`)[1]?.split('$$;')[0]
    assert.ok(functionBody, `${functionName} exists`)
    assert.match(functionBody, /security definer/i)
    assert.match(functionBody, /set search_path = ''/)
    assert.match(functionBody, /is_soleverse_admin/)
  }
  assert.match(management, /from auth\.users/)
  assert.match(management, /left\(lower\(u\.email\)/)
  assert.match(management, /limit 10/)
  assert.match(management, /target_user_not_found/)
  assert.match(management, /on conflict \(user_id\) do nothing/)
  assert.match(management, /lock table public\.soleverse_admins in exclusive mode/i)
  assert.match(management, /cannot_revoke_own_admin_access/)
  assert.match(management, /cannot_remove_last_admin/)
  assert.doesNotMatch(management, /grant\s+(?:all|insert|update|delete)[^;]*on\s+(?:table\s+)?public\.soleverse_admins/i)
  assert.match(management, /revoke all on function public\.soleverse_admin_grant_access\(uuid\) from public, anon/)
  assert.match(management, /grant execute on function public\.soleverse_admin_grant_access\(uuid\) to authenticated/)
})

test('sql: profile phone migration only adds an optional bounded field', () => {
  const profile = sqlOf('20261023000000_profile_phone.sql')
  assert.match(profile, /alter table public\.profiles\s+add column if not exists phone text/i)
  assert.match(profile, /char_length\(phone\) between 8 and 16/i)
  assert.match(profile, /phone ~ '\^\\\+\?\[1-9\]\[0-9\]\{6,14\}\$'/i)
  assert.doesNotMatch(profile, /disable row level security|grant\s+(?:all|insert|update|delete)/i)
})

test('sql: checkout delivery is still ₹99 and admin cannot edit payment status or order totals', () => {
  const orders = sqlOf('20261013000200_create_orders.sql')
  assert.match(orders, /as \$\$ select 99 \$\$/)
  const admin = sqlOf('20261019000000_phase7_admin.sql')
  assert.doesNotMatch(admin, /grant[^;]*update\s*\([^)]*(payment_status|total_inr)/i)
  assert.match(admin, /soleverse_admin_update_order_status/)
  assert.match(admin, /status in \('placed', 'processing', 'shipped', 'completed', 'cancelled'\)/)
})
