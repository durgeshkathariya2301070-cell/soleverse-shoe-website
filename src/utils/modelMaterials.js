// Helpers for reading and recolouring the materials of a 3D model.
//
// These functions work on any three.js object tree WITHOUT importing three.js themselves. They only use
// things every three.js mesh has (isMesh, material, material.color, traverse). That keeps them simple and
// lets us unit-test them with plain fake objects (see modelMaterials.test.js).
//
// Why clone the materials?
// A loaded glTF model is cached and shared. If we changed its materials directly, every other place that
// shows the same model (or the same page after a re-render) would change too. So we work on a private copy.

function toArray(material) {
  return Array.isArray(material) ? material : [material]
}

// Names of all materials found in the model. Handy for finding out what a new model calls its parts.
export function listMaterialNames(root) {
  const names = new Set()
  root.traverse((node) => {
    if (!node.isMesh) return
    for (const material of toArray(node.material)) {
      if (material?.name) names.add(material.name)
    }
  })
  return [...names]
}

// Gives every mesh its own copy of its material(s). Call this once on a CLONED scene.
export function cloneMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh) return
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => material.clone())
      : node.material.clone()
  })
}

// Builds a lookup: material name -> [{ material, originalHex }].
// originalHex remembers the starting colour so "Reset colours" can restore it exactly.
export function indexMaterialsByName(root) {
  const index = new Map()
  root.traverse((node) => {
    if (!node.isMesh) return
    for (const material of toArray(node.material)) {
      if (!material?.name || !material.color) continue
      if (!index.has(material.name)) index.set(material.name, [])
      index.get(material.name).push({ material, originalHex: material.color.getHex() })
    }
  })
  return index
}

// Keeps only the customisation options whose material really exists in this model.
// This is how we avoid advertising controls the model cannot support.
//   config: [{ id, label, materialName }]
export function getSupportedCustomizations(config, index) {
  return (config ?? []).filter((item) => index.has(item.materialName))
}

// Applies chosen colours. colorsById looks like { upper: '#D9FF64' }.
// A part with no chosen colour is put back to its original colour. Materials not in `config` are never touched.
export function applyCustomColors(index, config, colorsById) {
  for (const item of config ?? []) {
    const entries = index.get(item.materialName)
    if (!entries) continue
    const chosenHex = colorsById?.[item.id]
    for (const { material, originalHex } of entries) {
      if (chosenHex) material.color.set(chosenHex)
      else material.color.setHex(originalHex)
    }
  }
}

// Frees the GPU memory used by our private material copies. (Geometry and textures belong to the shared
// cached model, so they are NOT disposed here.)
export function disposeMaterials(index) {
  for (const entries of index.values()) {
    for (const { material } of entries) material.dispose?.()
  }
}
