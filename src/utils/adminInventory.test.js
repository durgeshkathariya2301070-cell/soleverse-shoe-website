import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { searchInventoryProducts, selectInventoryProduct } from './adminInventory.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const products = [
  { id: 'sv-1260', name: 'one8', brand: 'virat_shoe', category: 'sports', is_active: true },
  { id: 'sv-004', name: 'Pulse Trainer', brand: 'Nike', category: 'training', is_active: true },
  { id: 'sv-100', name: 'Hidden Runner', brand: 'Acme', category: 'running', is_active: false },
]

test('inventory product search matches name, brand, ID and includes unpublished products', () => {
  assert.deepEqual(searchInventoryProducts(products, 'one8').map((product) => product.id), ['sv-1260'])
  assert.deepEqual(searchInventoryProducts(products, 'virat_shoe').map((product) => product.id), ['sv-1260'])
  assert.deepEqual(searchInventoryProducts(products, 'pulse').map((product) => product.id), ['sv-004'])
  assert.deepEqual(searchInventoryProducts(products, 'nike').map((product) => product.id), ['sv-004'])
  assert.deepEqual(searchInventoryProducts(products, 'sv-1260').map((product) => product.id), ['sv-1260'])
  assert.deepEqual(searchInventoryProducts(products, 'hidden').map((product) => product.id), ['sv-100'])
})

test('inventory product search shows empty results and caps the suggestion list', () => {
  assert.deepEqual(searchInventoryProducts(products, 'no-such-product'), [])
  assert.equal(searchInventoryProducts(Array.from({ length: 12 }, (_, index) => ({ id: `${index}`, name: `Shoe ${index}` })), '').length, 8)
})

test('inventory product selection writes the selected database product ID only', () => {
  const form = { product_id: '', color_id: 'core-black', color_label: 'Core Black', size: '8', stock: '3' }
  assert.deepEqual(selectInventoryProduct(form, products[0]), { ...form, product_id: 'sv-1260' })
})

test('inventory autocomplete exposes keyboard-accessible combobox and product details', () => {
  const component = read('src/components/admin/InventoryProductAutocomplete.jsx')
  const page = read('src/pages/admin/AdminInventory.jsx')
  const navbar = read('src/components/Navbar.jsx')
  const adminRoute = read('src/components/admin/AdminRoute.jsx')

  assert.match(component, /role="combobox"/)
  assert.match(component, /aria-autocomplete="list"/)
  assert.match(component, /role="listbox"/)
  assert.match(component, /role="option"/)
  assert.match(component, /ArrowDown/)
  assert.match(component, /ArrowUp/)
  assert.match(component, /Escape/)
  assert.match(component, /product\.brand/)
  assert.match(component, /product\.category/)
  assert.match(component, /product\.is_active/)
  assert.match(component, /product\.image_url/)
  assert.match(page, /<InventoryProductAutocomplete/)
  assert.match(page, /selectInventoryProduct\(current, product\)/)
  assert.match(navbar, /verifyAdminAccess\(\)/)
  assert.match(navbar, /shouldShowAdminDashboard\(user, loading, adminAccess\)/)
  assert.match(navbar, /NavLink to="\/admin"/)
  assert.match(navbar, /Button to="\/admin"/)
  assert.match(adminRoute, /verifyAdminAccess\(\)/)
  assert.match(adminRoute, /access\.status === 'denied'/)
})

test('inventory query fetches only selector product fields and includes all admin-visible products', () => {
  const service = read('src/services/adminService.js')
  const inventoryQuery = service.match(/export async function fetchAdminInventory\(\)([\s\S]*?)(?=\n})/)?.[1]

  assert.ok(inventoryQuery)
  assert.match(inventoryQuery, /\.from\('products'\)/)
  assert.match(inventoryQuery, /\.select\('id, name, is_active, category, brand, image_url, product_images\(image_url, position\)'\)/)
  assert.match(inventoryQuery, /\.order\('position', \{ foreignTable: 'product_images', ascending: true \}\)/)
  assert.match(inventoryQuery, /\.limit\(1, \{ foreignTable: 'product_images' \}\)/)
  assert.doesNotMatch(inventoryQuery, /\.eq\(['"]is_active['"]/)
  assert.doesNotMatch(inventoryQuery, /from\('products'\)\s*\.select\(['"]\*['"]\)/)
  assert.doesNotMatch(inventoryQuery, /from\('product_variants'\)\s*\.select\(['"]\*['"]\)/)
})

test('existing inventory stock updates retain product, colour and size constraints', () => {
  const service = read('src/services/adminService.js')
  const saveVariant = service.match(/export async function saveAdminVariant\(variant, isNew\)([\s\S]*?)(?=\n})/)?.[1]

  assert.ok(saveVariant)
  assert.match(saveVariant, /\.update\(\{ stock: variant\.stock, color_label: variant\.color_label, color_hex: variant\.color_hex \}\)/)
  assert.match(saveVariant, /\.eq\('product_id', variant\.product_id\)/)
  assert.match(saveVariant, /\.eq\('color_id', variant\.color_id\)/)
  assert.match(saveVariant, /\.eq\('size', variant\.size\)/)
})
