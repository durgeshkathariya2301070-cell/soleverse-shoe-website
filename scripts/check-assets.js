// Checks that every sample image loads and every 3D model file is in place.
// Run it on a computer with internet access:   npm run check-assets
//
// - Broken or non-image web addresses are reported, and the script exits with an error.
// - A 3D product whose .glb file is missing is reported as "action needed" (not an error: it is expected until you add one).
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/data/products.js'
import { categories } from '../src/data/categories.js'
import { siteImages } from '../src/data/siteImages.js'
import { checkImageUrl, checkLocalImageFiles, checkModelFiles, collectImageEntries, uniqueUrlChecks } from './lib/assets.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const entries = collectImageEntries({ products, categories, siteImages })
  const checks = uniqueUrlChecks(entries).filter((check) => !check.url?.startsWith('/'))
  const localChecks = checkLocalImageFiles(entries, path.join(projectRoot, 'public'))
  console.log(`Checking ${checks.length} remote image address(es) and ${localChecks.length} local image file(s)...\n`)

  let broken = 0 // the server answered, but the image is wrong or missing
  for (const check of localChecks) {
    if (check.status !== 'ok') broken += 1
    console.log(`${check.status === 'ok' ? 'OK     ' : 'BROKEN '} ${check.owners.join(', ')}${check.status === 'ok' ? '' : `\n         -> ${check.problem}\n         ${check.src}`}`)
  }
  let unreachable = 0 // we could not connect at all, so the address was NOT actually checked
  // A few at a time, to be polite to the image server.
  for (let start = 0; start < checks.length; start += 4) {
    const batch = checks.slice(start, start + 4)
    const results = await Promise.all(
      batch.map(async (check) => (check.url ? checkImageUrl(check.url) : { ok: false, problem: 'no image address set' })),
    )
    batch.forEach((check, index) => {
      const result = results[index]
      const couldNotConnect = !result.ok && result.problem.startsWith('could not connect')
      if (couldNotConnect) unreachable += 1
      else if (!result.ok) broken += 1
      const label = result.ok ? 'OK     ' : couldNotConnect ? 'UNCHECKED' : 'BROKEN '
      console.log(`${label} ${check.owners.join(', ')}${result.ok ? '' : `\n         -> ${result.problem}\n         ${check.url ?? ''}`}`)
    })
  }

  console.log('\n3D model files:')
  const models = checkModelFiles(products, path.join(projectRoot, 'public'))
  let invalidModels = 0
  if (models.length === 0) console.log('  No product is set up for 3D.')
  for (const model of models) {
    if (model.status === 'ok') console.log(`  OK      ${model.slug}: public${model.modelPath}`)
    if (model.status === 'missing') console.log(`  ACTION NEEDED  ${model.slug}: put a licensed .glb at public${model.modelPath}  (try: npm run fetch-model, or see public/models/README.md)`)
    if (model.status === 'invalid') {
      invalidModels += 1
      console.log(`  INVALID ${model.slug}: public${model.modelPath} is not a .glb file`)
    }
  }

  console.log('')
  if (broken > 0) console.log(`${broken} image file(s) or address(es) are broken: replace them in the data files (src/data/products.js, categories.js, siteImages.js).`)
  if (unreachable > 0) console.log(`${unreachable} image address(es) could NOT be checked because the connection failed. Check your internet connection and run it again. This does not mean the images are broken.`)
  if (broken === 0 && unreachable === 0) console.log('All local image files and remote image addresses are available.')
  // Anything that is not confirmed as working counts as a failure, so the result can be trusted.
  process.exitCode = broken > 0 || unreachable > 0 || invalidModels > 0 ? 1 : 0
}

main()
