import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCatalogueRefreshError, getCatalogueErrorDetails } from './catalogueError.js'

test('catalogue errors expose a safe Supabase code and keep details in diagnostics', () => {
  const error = {
    code: 'PGRST200',
    message: 'Could not find a relationship between products and product_images',
    details: 'The relationship was not found in the schema cache.',
    hint: 'Reload the schema cache.',
  }

  assert.match(formatCatalogueRefreshError(error), /Supabase PGRST200/)
  assert.match(formatCatalogueRefreshError(error), /browser console/)
  assert.doesNotMatch(formatCatalogueRefreshError(error), /relationship was not found/)
  assert.deepEqual(getCatalogueErrorDetails(error), {
    code: 'PGRST200',
    message: error.message,
    details: error.details,
    hint: error.hint,
  })
})

test('catalogue errors without Supabase fields still produce useful diagnostics', () => {
  assert.deepEqual(getCatalogueErrorDetails(new Error('Network request failed')), {
    code: null,
    message: 'Network request failed',
    details: null,
    hint: null,
  })
  assert.equal(getCatalogueErrorDetails(null).message, 'Unknown error')
})
