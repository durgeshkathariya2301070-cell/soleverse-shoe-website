// Rewrites the seed block inside supabase/migrations/20261013000000_create_catalogue.sql
// from the sample products. Run it after you change src/data/products.js:  npm run generate-seed
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/data/products.js'
import { buildSeedSql, injectSeed } from './lib/catalogueSeed.js'

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations', '20261013000000_create_catalogue.sql')
// Keep the already-applied base migration limited to its original eight products.
// New products belong in the separate additive catalogue expansion migration.
const legacyProducts = products.filter((product) => Number(product.id.slice(3)) <= 8)
const next = injectSeed(fs.readFileSync(file, 'utf8'), buildSeedSql(legacyProducts))
fs.writeFileSync(file, next)
console.log(`Catalogue seed updated: ${products.length} products in ${path.relative(process.cwd(), file)}`)
