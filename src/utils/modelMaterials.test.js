// Tests for the material helpers, using small fake objects instead of real three.js.
// Run with:  npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listMaterialNames,
  cloneMaterials,
  indexMaterialsByName,
  getSupportedCustomizations,
  applyCustomColors,
  disposeMaterials,
} from './modelMaterials.js'

// ---- tiny fakes that behave like the parts of three.js we use ----
class FakeColor {
  constructor(hex) { this.hex = hex }
  getHex() { return this.hex }
  setHex(hex) { this.hex = hex }
  set(value) { this.hex = typeof value === 'string' ? parseInt(value.replace('#', ''), 16) : value }
}
class FakeMaterial {
  constructor(name, hex) { this.name = name; this.color = new FakeColor(hex); this.disposed = false }
  clone() { return new FakeMaterial(this.name, this.color.getHex()) }
  dispose() { this.disposed = true }
}
const mesh = (material) => ({ isMesh: true, material })
const makeRoot = (nodes) => ({ traverse: (callback) => nodes.forEach(callback) })

function buildShoe() {
  const upper = new FakeMaterial('upper', 0xaaaaaa)
  const sole = new FakeMaterial('sole', 0xffffff)
  const laces = new FakeMaterial('laces', 0x111111)
  const root = makeRoot([mesh(upper), mesh(sole), mesh([laces, new FakeMaterial('badge', 0xff0000)]), { isMesh: false }])
  return { root, upper, sole, laces }
}

const config = [
  { id: 'upper', label: 'Upper', materialName: 'upper' },
  { id: 'sole', label: 'Sole', materialName: 'sole' },
  { id: 'laces', label: 'Laces', materialName: 'laces' },
  { id: 'tongue', label: 'Tongue', materialName: 'tongue' }, // does not exist in this model
]

test('listMaterialNames finds names, including material arrays, and ignores non-meshes', () => {
  assert.deepEqual(listMaterialNames(buildShoe().root).sort(), ['badge', 'laces', 'sole', 'upper'])
})

test('cloneMaterials gives every mesh its own copy and leaves the originals alone', () => {
  const { root, upper } = buildShoe()
  cloneMaterials(root)
  const nodes = []
  root.traverse((node) => nodes.push(node))
  assert.notEqual(nodes[0].material, upper)
  assert.equal(nodes[0].material.name, 'upper')
  assert.ok(Array.isArray(nodes[2].material) && nodes[2].material.length === 2)
})

test('only options whose material exists are reported as supported', () => {
  const { root } = buildShoe()
  const supported = getSupportedCustomizations(config, indexMaterialsByName(root)).map((item) => item.id)
  assert.deepEqual(supported, ['upper', 'sole', 'laces'])
  assert.deepEqual(getSupportedCustomizations(undefined, indexMaterialsByName(root)), [])
  assert.deepEqual(getSupportedCustomizations(config, indexMaterialsByName(makeRoot([]))), [])
})

test('colour changes affect the cloned materials only, never the shared originals', () => {
  const { root, upper, sole } = buildShoe()
  cloneMaterials(root)
  const index = indexMaterialsByName(root)
  applyCustomColors(index, config, { upper: '#D9FF64' })
  assert.equal(index.get('upper')[0].material.color.getHex(), 0xd9ff64)
  assert.equal(upper.color.getHex(), 0xaaaaaa, 'shared original must not change')
  assert.equal(sole.color.getHex(), 0xffffff)
  assert.equal(index.get('sole')[0].material.color.getHex(), 0xffffff, 'unselected parts stay untouched')
})

test('materials not listed in the config (the badge) are never modified', () => {
  const { root } = buildShoe()
  cloneMaterials(root)
  const index = indexMaterialsByName(root)
  applyCustomColors(index, config, { upper: '#000000', sole: '#000000', laces: '#000000' })
  assert.equal(index.get('badge')[0].material.color.getHex(), 0xff0000)
})

test('resetting (no chosen colours) restores the original colours', () => {
  const { root } = buildShoe()
  cloneMaterials(root)
  const index = indexMaterialsByName(root)
  applyCustomColors(index, config, { upper: '#D7382D', sole: '#26407A' })
  applyCustomColors(index, config, {})
  assert.equal(index.get('upper')[0].material.color.getHex(), 0xaaaaaa)
  assert.equal(index.get('sole')[0].material.color.getHex(), 0xffffff)
})

test('unsupported options are ignored without errors', () => {
  const { root } = buildShoe()
  cloneMaterials(root)
  assert.doesNotThrow(() => applyCustomColors(indexMaterialsByName(root), config, { tongue: '#ffffff' }))
})

test('disposeMaterials disposes the private copies only', () => {
  const { root, upper } = buildShoe()
  cloneMaterials(root)
  const index = indexMaterialsByName(root)
  disposeMaterials(index)
  assert.ok(index.get('upper')[0].material.disposed)
  assert.equal(upper.disposed, false)
})
