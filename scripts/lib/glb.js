// Reads the header information of a .glb (binary glTF) file using only built-in Node features.
// A .glb starts with a 12-byte header, then a JSON chunk that describes the model (its materials, meshes, etc.).
// We only read that JSON. No 3D library is needed.

const JSON_CHUNK_TYPE = 0x4e4f534a // the letters "JSON" as a number

// Throws a clear error if the buffer is not a valid .glb file.
export function inspectGlb(buffer) {
  if (!buffer || buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('This is not a binary glTF (.glb) file. (A web page or another format was probably downloaded.)')
  }

  const version = buffer.readUInt32LE(4)
  if (version !== 2) throw new Error(`Unsupported glTF version ${version}. Version 2 is required.`)

  const jsonLength = buffer.readUInt32LE(12)
  if (buffer.readUInt32LE(16) !== JSON_CHUNK_TYPE || 20 + jsonLength > buffer.length) {
    throw new Error('The .glb file is damaged: its description section could not be read.')
  }

  let json
  try {
    json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength))
  } catch {
    throw new Error('The .glb file is damaged: its description section is not valid.')
  }

  const extensionsUsed = json.extensionsUsed ?? []
  return {
    byteLength: buffer.length,
    materialNames: (json.materials ?? []).map((material) => material.name).filter(Boolean),
    meshCount: (json.meshes ?? []).length,
    imageCount: (json.images ?? []).length,
    extensionsUsed,
    usesDraco: extensionsUsed.includes('KHR_draco_mesh_compression'),
    generator: json.asset?.generator ?? null,
  }
}

// Guesses which material is the upper, sole and laces from their names.
// It is only a SUGGESTION to paste into products.js: always check it against the real model.
const GUESSES = [
  { id: 'upper', label: 'Upper', pattern: /upper|mesh|body|textile|knit|leather|canvas/i },
  { id: 'sole', label: 'Sole', pattern: /sole|outsole|midsole|rubber|foam/i },
  { id: 'laces', label: 'Laces', pattern: /lace/i },
]

export function suggestMaterialMapping(materialNames) {
  const used = new Set()
  const suggestions = []
  for (const guess of GUESSES) {
    const match = materialNames.find((name) => !used.has(name) && guess.pattern.test(name))
    if (match) {
      used.add(match)
      suggestions.push({ id: guess.id, label: guess.label, materialName: match })
    }
  }
  return suggestions
}
