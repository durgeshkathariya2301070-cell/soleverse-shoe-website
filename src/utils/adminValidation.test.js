import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateAdminProduct,
  validateAdminProductVariants,
  validateAdminVariant,
} from './adminValidation.js'

test('admin product validation accepts bounded product fields', () => {
  assert.deepEqual(validateAdminProduct({
    id: 'sv-new', slug: 'new-runner', name: 'New Runner', category: 'running',
    price_inr: '7999', image_url: '/images/new-runner.jpg', short_description: '', description: '',
  }), {})
})

test('admin product validation rejects malformed ids, unsafe image urls and invalid price', () => {
  const errors = validateAdminProduct({
    id: 'New Product', slug: '../login', name: '', category: 'Running',
    price_inr: -1, image_url: 'javascript:alert(1)', description: '',
  })
  for (const field of ['id', 'slug', 'name', 'category', 'price_inr', 'image_url']) assert.ok(errors[field], field)
})

test('admin variant validation prevents invalid and negative stock quantities', () => {
  const valid = { product_id: 'sv-001', color_id: 'black', color_label: 'Core Black', size: '8', stock: '0', color_hex: '#171717' }
  assert.deepEqual(validateAdminVariant(valid), {})
  assert.ok(validateAdminVariant({ ...valid, stock: '-1' }).stock)
  assert.ok(validateAdminVariant({ ...valid, size: '21' }).size)
  assert.ok(validateAdminVariant({ ...valid, color_hex: 'red' }).color_hex)
  assert.ok(validateAdminVariant({ ...valid, stock: '' }).stock)
})

test('product variants reject duplicate colour-size keys and invalid fields', () => {
  const valid = {
    color_id: 'core-black',
    color_label: 'Core Black',
    color_hex: '#171717',
    size: '8',
    stock: '10',
    persisted: false,
  }
  assert.deepEqual(validateAdminProductVariants([valid]), {})
  const errors = validateAdminProductVariants([
    valid,
    { ...valid, stock: '-1' },
  ])
  assert.match(errors['variants.1.size'], /duplicated/)
  assert.match(errors['variants.1.stock'], /Stock must/)
  assert.ok(validateAdminProductVariants([{ ...valid, color_id: 'Core Black' }])['variants.0.color_id'])
})
