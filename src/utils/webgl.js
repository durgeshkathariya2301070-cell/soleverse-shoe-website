// Checks once whether this browser can draw 3D graphics (WebGL). The answer is remembered, because
// creating test contexts over and over wastes resources.
let cachedResult = null

export function canUseWebGL() {
  if (cachedResult !== null) return cachedResult
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    cachedResult = Boolean(context)
  } catch {
    cachedResult = false
  }
  return cachedResult
}
