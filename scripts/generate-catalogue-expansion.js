import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/data/products.js'
import { buildCatalogueExpansionSql } from './lib/catalogueSeed.js'

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
  '20261024000100_expand_catalogue_to_30.sql',
)
fs.writeFileSync(file, buildCatalogueExpansionSql(products))
console.log(`Additive catalogue migration generated: ${products.length} products in total.`)
