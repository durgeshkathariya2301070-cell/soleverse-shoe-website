import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearAdminProductDraft,
  readAdminProductDraft,
  writeAdminProductDraft,
} from './adminProductDraft.js'

const form = {
  id: 'sv-043',
  slug: 'new-runner',
  name: 'New Runner',
  category: 'running',
  brand: '',
  sport: '',
  style: '',
  price_inr: '6999',
  short_description: '',
  description: '',
  image_url: '',
  images: [{ url: 'https://example.test/shoe.jpg', alt_text: 'Side view' }],
  variants: [{
    color_id: 'black',
    color_label: 'Core Black',
    color_hex: '#171717',
    size: '8',
    stock: '10',
    persisted: false,
  }],
  is_active: false,
}

function withSessionStorage(run) {
  const values = new Map()
  const originalWindow = globalThis.window
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  }
  try {
    run(values)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
}

test('product drafts round-trip only the product form fields and can be cleared', () => {
  withSessionStorage(() => {
    assert.equal(writeAdminProductDraft(form), true)
    assert.deepEqual(readAdminProductDraft(), { form, error: false })
    assert.equal(clearAdminProductDraft(), true)
    assert.deepEqual(readAdminProductDraft(), { form: null, error: false })
  })
})

test('malformed, outdated, and unexpected draft shapes are discarded safely', () => {
  withSessionStorage((values) => {
    const key = 'soleverse.admin.create-product-draft'
    values.set(key, '{not json')
    assert.deepEqual(readAdminProductDraft(), { form: null, error: false })

    values.set(key, JSON.stringify({ version: 1, form }))
    assert.deepEqual(readAdminProductDraft(), { form: null, error: false })

    values.set(key, JSON.stringify({
      version: 1,
      form: { ...form, access_token: 'must not be restored' },
    }))
    assert.deepEqual(readAdminProductDraft(), { form: null, error: false })

    values.set(key, JSON.stringify({
      version: 2,
      form: {
        ...form,
        variants: [{ ...form.variants[0], access_token: 'must not be restored' }],
      },
    }))
    assert.deepEqual(readAdminProductDraft(), { form: null, error: false })
  })
})
