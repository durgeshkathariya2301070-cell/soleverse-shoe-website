// Logic for checking that every image and 3D model used by the site is really available.
// The network call is passed in (`fetchFn`) so the tests can use a pretend network.
import fs from 'node:fs'
import path from 'node:path'
import { getImageSources } from '../../src/utils/images.js'
import { has3DModel } from '../../src/data/products.js'

// Lists every image entry in the data files, with a readable owner name.
export function collectImageEntries({ products, categories, siteImages }) {
  const entries = []
  for (const product of products) {
    product.images.forEach((image, index) => entries.push({ owner: `${product.slug} image ${index + 1}`, image }))
  }
  for (const category of categories) entries.push({ owner: `category ${category.id}`, image: category.image })
  for (const [name, image] of Object.entries(siteImages)) entries.push({ owner: `site image "${name}"`, image })
  return entries
}

// The close-up gallery crops reuse the same photo, so each web address only needs checking once.
export function uniqueUrlChecks(entries) {
  const byUrl = new Map()
  for (const { owner, image } of entries) {
    const { src } = getImageSources(image)
    if (!src) {
      byUrl.set(`missing:${owner}`, { url: null, owners: [owner] })
      continue
    }
    if (!byUrl.has(src)) byUrl.set(src, { url: src, owners: [] })
    byUrl.get(src).owners.push(owner)
  }
  return [...byUrl.values()]
}

// Verifies local image paths against public/ and checks that each file has a JPEG signature.
export function checkLocalImageFiles(entries, publicDir) {
  const byPath = new Map()
  for (const { owner, image } of entries) {
    const { src } = getImageSources(image)
    if (!src?.startsWith('/')) continue
    if (!byPath.has(src)) byPath.set(src, [])
    byPath.get(src).push(owner)
  }

  return [...byPath].map(([src, owners]) => {
    const filePath = path.resolve(publicDir, `.${src.replaceAll('/', path.sep)}`)
    const relative = path.relative(publicDir, filePath)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return { src, owners, status: 'invalid', problem: 'path escapes the public directory' }
    }
    if (!fs.existsSync(filePath)) return { src, owners, status: 'missing', problem: 'file not found' }
    const fd = fs.openSync(filePath, 'r')
    const header = Buffer.alloc(2)
    try {
      fs.readSync(fd, header, 0, header.length, 0)
    } finally {
      fs.closeSync(fd)
    }
    return header[0] === 0xff && header[1] === 0xd8
      ? { src, owners, status: 'ok', problem: '' }
      : { src, owners, status: 'invalid', problem: 'file is not a JPEG image' }
  })
}

// Checks one image address. It counts as working only if the server answers OK AND says it is an image.
export async function checkImageUrl(url, fetchFn = fetch, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchFn(url, { headers: { Range: 'bytes=0-1023' }, signal: controller.signal })
    const contentType = response.headers.get('content-type') ?? ''
    response.body?.cancel?.().catch?.(() => {}) // we only need the headers
    if (!response.ok) return { ok: false, status: response.status, problem: `HTTP ${response.status}` }
    if (!contentType.startsWith('image/')) return { ok: false, status: response.status, problem: `not an image (${contentType || 'no type'})` }
    return { ok: true, status: response.status, contentType }
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timed out' : (error.cause?.code ?? error.message)
    return { ok: false, status: null, problem: `could not connect (${reason})` }
  } finally {
    clearTimeout(timer)
  }
}

// Local model files: does each 3D product's .glb exist in public/, and does it look like a real .glb?
export function checkModelFiles(products, publicDir) {
  return products.filter(has3DModel).map((product) => {
    const filePath = path.join(publicDir, product.modelPath)
    if (!fs.existsSync(filePath)) {
      return { slug: product.slug, modelPath: product.modelPath, status: 'missing' }
    }
    const header = Buffer.alloc(4)
    const fd = fs.openSync(filePath, 'r')
    try {
      fs.readSync(fd, header, 0, 4, 0)
    } finally {
      fs.closeSync(fd)
    }
    const valid = header.toString('ascii') === 'glTF'
    return { slug: product.slug, modelPath: product.modelPath, status: valid ? 'ok' : 'invalid' }
  })
}
