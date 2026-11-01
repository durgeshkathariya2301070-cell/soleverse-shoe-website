// Downloads a 3D model into the project, but only if it is really a .glb file.
import fs from 'node:fs'
import path from 'node:path'
import { inspectGlb, suggestMaterialMapping } from './glb.js'

const MAX_BYTES = 40 * 1024 * 1024 // refuse anything over 40 MB

// source: the object from scripts/model-source.json
// Returns { destination, report, suggestion }. Throws a readable error if anything looks wrong.
export async function downloadModel({ source, destination, fetchFn = fetch, force = false }) {
  if (fs.existsSync(destination) && !force) {
    throw new Error(`${destination} already exists. Use --force to replace it.`)
  }

  const response = await fetchFn(source.url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`The download failed: HTTP ${response.status} from ${source.url}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > MAX_BYTES) throw new Error('The file is larger than 40 MB, so it was not saved.')

  const report = inspectGlb(buffer) // throws if this is not a real .glb (for example a web page)

  fs.mkdirSync(path.dirname(destination), { recursive: true })
  const temporary = `${destination}.download`
  fs.writeFileSync(temporary, buffer)
  fs.renameSync(temporary, destination)

  return { destination, report, suggestion: suggestMaterialMapping(report.materialNames) }
}
