import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('Supabase auth uses its normal persistent browser storage without custom token copying', () => {
  const client = read('src/lib/supabaseClient.js')
  const auth = read('src/context/AuthContext.jsx')
  assert.match(client, /persistSession:\s*true/)
  assert.match(client, /autoRefreshToken:\s*true/)
  assert.match(client, /detectSessionInUrl:\s*true/)
  assert.doesNotMatch(client, /storageKey:|storage:\s|localStorage|sessionStorage/)
  assert.match(auth, /onAuthStateChange\(/)
  assert.match(auth, /getSession\(\)/)
  assert.match(auth, /if \(active && !authStateChanged\) setSession/)
  assert.match(auth, /data\.subscription\.unsubscribe\(\)/)
  assert.doesNotMatch(auth, /localStorage|sessionStorage|access_token|refresh_token/)
})

test('login switches to the authenticated account and logout clears only the local browser session', () => {
  const auth = read('src/context/AuthContext.jsx')
  const login = auth.match(/const signIn = useCallback\(async \(\{ email, password \}\) =>([\s\S]*?)\n  \}, \[\]\)/)?.[1]
  const logout = auth.match(/const signOut = useCallback\(async \(\) =>([\s\S]*?)\n  \}, \[\]\)/)?.[1]

  assert.ok(login)
  assert.ok(logout)
  assert.match(login, /signInWithPassword\(\{ email, password \}\)/)
  assert.match(login, /setSession\(data\.session\)/)
  assert.match(logout, /signOut\(\{ scope: 'local' \}\)/)
  assert.match(logout, /setSession\(null\)/)
  assert.doesNotMatch(auth, /localStorage\.setItem|sessionStorage\.setItem|password.*localStorage|password.*sessionStorage/i)
})

test('customer private records and admin operations stay server-authorized', () => {
  const profiles = read('supabase/migrations/20261011000000_create_profiles.sql')
  const cart = read('supabase/migrations/20261013000100_create_cart_items.sql')
  const orders = read('supabase/migrations/20261013000200_create_orders.sql')
  const notifications = read('supabase/migrations/20261026000400_customer_delivery_confirmation.sql')
  const admin = read('supabase/migrations/20261019000000_phase7_admin.sql')
  const adminRoute = read('src/components/admin/AdminRoute.jsx')
  const localChecks = read('supabase/local-test/10_checks.sql')

  assert.match(profiles, /using \(\(select auth\.uid\(\)\) = id\)/)
  assert.match(profiles, /with check \(\(select auth\.uid\(\)\) = id\)/)
  assert.match(cart, /using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(cart, /with check \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(orders, /using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(orders, /o\.user_id = \(select auth\.uid\(\)\)/)
  assert.match(notifications, /using \(\(select auth\.uid\(\)\) = customer_id\)/)
  assert.match(notifications, /c\.customer_id = auth\.uid\(\) and o\.user_id = auth\.uid\(\)/)
  assert.match(admin, /if not public\.is_soleverse_admin\(\) then/)
  assert.match(adminRoute, /verifyAdminAccess\(\)/)
  assert.match(localChecks, /customer cannot read another profile/)
  assert.match(localChecks, /user B cannot see user A bag/)
  assert.match(localChecks, /user B cannot read user A orders/)
  assert.match(localChecks, /customer notification query excludes another customer order/)
})
