// Downloads the sneaker model described in scripts/model-source.json into public/models/sneaker.glb,
// then lists its material names and suggests the settings for products.js.
//
//   npm run fetch-model                     shows what would be downloaded and its licence (downloads nothing)
//   npm run fetch-model -- --accept-license downloads it, AFTER you have read and accepted the licence
//   add --force to replace an existing sneaker.glb
//
// IMPORTANT: you are responsible for checking that the licence allows your use.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { downloadModel } from './lib/model.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts', 'model-source.json'), 'utf8'))
const destination = path.join(projectRoot, 'public', 'models', 'sneaker.glb')
const args = process.argv.slice(2)

console.log(`Model:        ${source.name}`)
console.log(`Source page:  ${source.sourcePage}`)
console.log(`Licence:      ${source.license}`)
console.log(`Licence page: ${source.licenseUrl}`)
console.log(`Verified:     ${source.licenseVerified ? 'yes' : 'NO. Nobody has confirmed this licence for you yet.'}`)
if (source.note) console.log(`Note:         ${source.note}`)
console.log('')

if (!args.includes('--accept-license')) {
  console.log('Nothing was downloaded.')
  console.log('1. Open the licence page above and read it. Check it allows use on a shop website,')
  console.log('   whether it needs credit, and that the model does not copy a real brand.')
  console.log('2. If you accept it, run:  npm run fetch-model -- --accept-license')
  process.exit(0)
}

try {
  const { report, suggestion } = await downloadModel({ source, destination, force: args.includes('--force') })

  // Keep a record of where the file came from (useful for credit and for later checks).
  fs.writeFileSync(
    path.join(projectRoot, 'public', 'models', 'sneaker.source.json'),
    JSON.stringify({ ...source, downloadedAt: new Date().toISOString(), acceptedByUser: true }, null, 2) + '\n',
  )

  console.log(`Saved ${path.relative(projectRoot, destination)} (${(report.byteLength / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`Meshes: ${report.meshCount}   Images/textures: ${report.imageCount}`)
  console.log(`Material names in this model: ${report.materialNames.length ? report.materialNames.join(', ') : '(none named)'}`)
  if (report.usesDraco) {
    console.log('\nWARNING: this model uses Draco compression. The viewer does not load Draco models (it avoids an internet download).')
    console.log('Re-export it without Draco, or use a different model.')
  }
  if (source.attribution) console.log(`\nCredit required: ${source.attribution}`)

  console.log('\nSuggested customizableMaterials for src/data/products.js (CHECK these against the model):')
  if (suggestion.length === 0) console.log('  No part names matched upper / sole / laces. Pick names from the list above, or skip customising.')
  else console.log(JSON.stringify(suggestion, null, 2).replace(/^/gm, '  '))
  if (suggestion.length) console.log('\nIf a part is missing here, the viewer simply will not offer a colour control for it.')
} catch (error) {
  console.error(`\nFailed: ${error.message}`)
  process.exit(1)
}
