import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('public footer provides brand tagline, useful routes, current-year copyright, and exact contact links', () => {
  const footer = read('src/components/Footer.jsx')
  const layout = read('src/components/Layout.jsx')
  assert.match(footer, /Designed for everyday movement\. Built for individual expression\./)
  assert.match(footer, /to="\/shop"/)
  assert.match(footer, /to="\/collections"/)
  assert.match(footer, /to="\/account"/)
  assert.match(footer, /Contact Us/)
  assert.match(footer, /href="mailto:kathariyadurgesh@gmail\.com"/)
  assert.match(footer, /href="tel:9054187409"[^]*9054187409/)
  assert.match(footer, /href="tel:9812678483"[^]*9812678483/)
  assert.match(footer, /new Date\(\)\.getFullYear\(\)/)
  assert.match(layout, /!pathname\.startsWith\('\/admin'\) && <Footer \/>/)
})

test('inactive newsletter form is replaced by a functional, honest contact call to action', () => {
  const contactSection = read('src/components/home/NewsletterPreview.jsx')
  assert.match(contactSection, /href="mailto:kathariyadurgesh@gmail\.com"/)
  assert.match(contactSection, /no newsletter signup or email service is configured/)
  assert.doesNotMatch(contactSection, /<form|<input|disabled|coming soon|NOT AVAILABLE YET/i)
})
