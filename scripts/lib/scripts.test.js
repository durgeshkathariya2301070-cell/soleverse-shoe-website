// Tests for the asset scripts. They use a pretend network and a tiny .glb built in memory.
// Run with:  npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { inspectGlb, suggestMaterialMapping } from './glb.js'
import { checkImageUrl, checkLocalImageFiles, checkModelFiles, collectImageEntries, uniqueUrlChecks } from './assets.js'
import { downloadModel } from './model.js'
import { products } from '../../src/data/products.js'
import { categories } from '../../src/data/categories.js'
import { siteImages } from '../../src/data/siteImages.js'

// Builds a minimal valid .glb whose JSON describes the given model.
function makeGlb(json) {
  const body = Buffer.from(JSON.stringify(json))
  const padded = Buffer.concat([body, Buffer.alloc((4 - (body.length % 4)) % 4, 0x20)])
  const header = Buffer.alloc(12)
  header.write('glTF', 0, 'ascii')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + padded.length, 8)
  const chunkHeader = Buffer.alloc(8)
  chunkHeader.writeUInt32LE(padded.length, 0)
  chunkHeader.writeUInt32LE(0x4e4f534a, 4)
  return Buffer.concat([header, chunkHeader, padded])
}

const shoeJson = {
  asset: { version: '2.0', generator: 'test' },
  materials: [{ name: 'Mesh_Upper' }, { name: 'rubber_sole' }, { name: 'Laces' }, { name: 'badge' }],
  meshes: [{}, {}],
  images: [{}],
}

const fakeResponse = ({ ok = true, status = 200, type = 'image/jpeg', body = 'x' } = {}) => ({
  ok,
  status,
  headers: { get: (name) => (name.toLowerCase() === 'content-type' ? type : null) },
  body: { cancel: async () => {} },
  arrayBuffer: async () => (Buffer.isBuffer(body) ? body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) : Buffer.from(body).buffer),
})

// ---- GLB inspection ----
test('inspectGlb reads materials, meshes and compression info', () => {
  const report = inspectGlb(makeGlb(shoeJson))
  assert.deepEqual(report.materialNames, ['Mesh_Upper', 'rubber_sole', 'Laces', 'badge'])
  assert.equal(report.meshCount, 2)
  assert.equal(report.usesDraco, false)
  assert.equal(inspectGlb(makeGlb({ ...shoeJson, extensionsUsed: ['KHR_draco_mesh_compression'] })).usesDraco, true)
})

test('inspectGlb rejects anything that is not a real .glb', () => {
  assert.throws(() => inspectGlb(Buffer.from('<!doctype html><html></html>')), /not a binary glTF/)
  assert.throws(() => inspectGlb(Buffer.alloc(0)), /not a binary glTF/)
  const damaged = makeGlb(shoeJson)
  damaged.writeUInt32LE(1, 4) // wrong version
  assert.throws(() => inspectGlb(damaged), /version/)
  const cut = makeGlb(shoeJson).subarray(0, 30) // chopped off
  assert.throws(() => inspectGlb(cut), /damaged/)
})

test('material suggestions follow the names but never reuse a material or invent parts', () => {
  assert.deepEqual(
    suggestMaterialMapping(['Mesh_Upper', 'rubber_sole', 'Laces', 'badge']).map((s) => [s.id, s.materialName]),
    [['upper', 'Mesh_Upper'], ['sole', 'rubber_sole'], ['laces', 'Laces']],
  )
  assert.deepEqual(suggestMaterialMapping(['Material.001', 'Material.002']), [])
  assert.deepEqual(suggestMaterialMapping(['Body']).map((s) => s.id), ['upper'])
})

// ---- Image checks ----
test('image entries cover every product, category and site image, and shared photos are checked once', () => {
  const entries = collectImageEntries({ products, categories, siteImages })
  const expected = products.reduce((sum, p) => sum + p.images.length, 0) + categories.length + Object.keys(siteImages).length
  assert.equal(entries.length, expected)
  const checks = uniqueUrlChecks(entries)
  assert.ok(checks.length < entries.length, 'close-up crops share one address and must be de-duplicated')
  assert.ok(checks.some((check) => check.url?.startsWith('/products/')))
  assert.ok(checks.some((check) => check.url?.startsWith('https://')))
  assert.equal(checkLocalImageFiles(entries, path.resolve('public')).every((check) => check.status === 'ok'), true)
})

test('local image validation rejects missing and non-JPEG files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soleverse-images-'))
  fs.mkdirSync(path.join(dir, 'products'))
  fs.writeFileSync(path.join(dir, 'products', 'shoe.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
  fs.writeFileSync(path.join(dir, 'products', 'wrong.jpg'), 'not an image')
  const checks = checkLocalImageFiles([
    { owner: 'good', image: { src: '/products/shoe.jpg', alt: 'shoe' } },
    { owner: 'missing', image: { src: '/products/missing.jpg', alt: 'missing' } },
    { owner: 'invalid', image: { src: '/products/wrong.jpg', alt: 'wrong' } },
  ], dir)
  assert.deepEqual(checks.map((check) => check.status), ['ok', 'missing', 'invalid'])
})

test('a good image passes; bad status, non-image and network errors are all reported as broken', async () => {
  assert.equal((await checkImageUrl('u', async () => fakeResponse())).ok, true)
  const notFound = await checkImageUrl('u', async () => fakeResponse({ ok: false, status: 404 }))
  assert.deepEqual([notFound.ok, notFound.problem], [false, 'HTTP 404'])
  const html = await checkImageUrl('u', async () => fakeResponse({ type: 'text/html' }))
  assert.equal(html.ok, false)
  assert.match(html.problem, /not an image/)
  const offline = await checkImageUrl('u', async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } }) })
  assert.equal(offline.ok, false)
  assert.match(offline.problem, /ENOTFOUND/)
})

test('model file check distinguishes missing, invalid and valid files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soleverse-'))
  fs.mkdirSync(path.join(dir, 'models'))
  const target = products.find((p) => p.modelPath)
  assert.equal(checkModelFiles(products, dir)[0].status, 'missing')
  fs.writeFileSync(path.join(dir, target.modelPath), 'not a glb')
  assert.equal(checkModelFiles(products, dir)[0].status, 'invalid')
  fs.writeFileSync(path.join(dir, target.modelPath), makeGlb(shoeJson))
  assert.equal(checkModelFiles(products, dir)[0].status, 'ok')
})

// ---- Model download ----
test('downloadModel saves a valid .glb and reports its materials', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soleverse-'))
  const destination = path.join(dir, 'models', 'sneaker.glb')
  const result = await downloadModel({ source: { url: 'https://example.test/a.glb' }, destination, fetchFn: async () => fakeResponse({ body: makeGlb(shoeJson) }) })
  assert.ok(fs.existsSync(destination))
  assert.equal(fs.existsSync(`${destination}.download`), false, 'no temporary file left behind')
  assert.deepEqual(result.suggestion.map((s) => s.id), ['upper', 'sole', 'laces'])
})

test('downloadModel refuses web pages, failed downloads and overwriting, and saves nothing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soleverse-'))
  const destination = path.join(dir, 'sneaker.glb')
  await assert.rejects(downloadModel({ source: { url: 'u' }, destination, fetchFn: async () => fakeResponse({ type: 'text/html', body: '<html>404</html>' }) }), /not a binary glTF/)
  await assert.rejects(downloadModel({ source: { url: 'u' }, destination, fetchFn: async () => fakeResponse({ ok: false, status: 404 }) }), /HTTP 404/)
  assert.equal(fs.existsSync(destination), false)
  fs.writeFileSync(destination, makeGlb(shoeJson))
  await assert.rejects(downloadModel({ source: { url: 'u' }, destination, fetchFn: async () => fakeResponse({ body: makeGlb(shoeJson) }) }), /already exists/)
  await assert.doesNotReject(downloadModel({ source: { url: 'u' }, destination, force: true, fetchFn: async () => fakeResponse({ body: makeGlb(shoeJson) }) }))
})
