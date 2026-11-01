import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/data/products.js'
import { buildCatalogueImageFixSql } from './lib/catalogueSeed.js'

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
  '20261024000300_correct_catalogue_product_images.sql',
)
fs.writeFileSync(file, buildCatalogueImageFixSql(products))
console.log(`Safe image correction migration generated for ${products.length} catalogue products.`)
