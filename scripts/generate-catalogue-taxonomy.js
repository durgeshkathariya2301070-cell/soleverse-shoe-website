import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/data/products.js'
import { buildCatalogueTaxonomySql } from './lib/catalogueSeed.js'

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
  '20261024000200_catalogue_brands_sports.sql',
)
fs.writeFileSync(file, buildCatalogueTaxonomySql(products))
console.log(`Catalogue taxonomy migration generated: ${products.length} products total.`)
