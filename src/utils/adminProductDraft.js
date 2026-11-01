const STORAGE_KEY = 'soleverse.admin.create-product-draft'
const DRAFT_VERSION = 2
const FORM_FIELDS = [
  'id',
  'slug',
  'name',
  'category',
  'brand',
  'sport',
  'style',
  'price_inr',
  'short_description',
  'description',
  'image_url',
  'images',
  'variants',
  'is_active',
]

function isImageList(value) {
  return Array.isArray(value) && value.length <= 50 && value.every((image) => (
    image
    && typeof image === 'object'
    && !Array.isArray(image)
    && Object.keys(image).length === 2
    && typeof image.url === 'string'
    && typeof image.alt_text === 'string'
  ))
}

function isVariantList(value) {
  return Array.isArray(value) && value.length <= 100 && value.every((variant) => (
    variant
    && typeof variant === 'object'
    && !Array.isArray(variant)
    && Object.keys(variant).length === 6
    && ['color_id', 'color_label', 'color_hex', 'size', 'stock', 'persisted'].every((field) => field in variant)
    && typeof variant.color_id === 'string'
    && typeof variant.color_label === 'string'
    && typeof variant.color_hex === 'string'
    && typeof variant.size === 'string'
    && typeof variant.stock === 'string'
    && typeof variant.persisted === 'boolean'
  ))
}

function getStorage() {
  try {
    return { storage: window.sessionStorage, error: false }
  } catch {
    return { storage: null, error: true }
  }
}

function isProductForm(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== FORM_FIELDS.length || !FORM_FIELDS.every((field) => keys.includes(field))) return false
  return FORM_FIELDS.every((field) => (
    field === 'is_active'
      ? typeof value[field] === 'boolean'
      : field === 'images'
        ? isImageList(value[field])
        : field === 'variants'
          ? isVariantList(value[field])
      : typeof value[field] === 'string'
  ))
}

export function readAdminProductDraft() {
  const { storage, error } = getStorage()
  if (!storage) return { form: null, error }

  try {
    const serialized = storage.getItem(STORAGE_KEY)
    if (!serialized) return { form: null, error: false }
    const draft = JSON.parse(serialized)
    if (draft?.version !== DRAFT_VERSION || !isProductForm(draft.form)) {
      storage.removeItem(STORAGE_KEY)
      return { form: null, error: false }
    }
    return { form: draft.form, error: false }
  } catch {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      return { form: null, error: true }
    }
    return { form: null, error: false }
  }
}

export function writeAdminProductDraft(form) {
  const { storage } = getStorage()
  if (!storage || !isProductForm(form)) return false

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: DRAFT_VERSION, form }))
    return true
  } catch {
    return false
  }
}

export function clearAdminProductDraft() {
  const { storage } = getStorage()
  if (!storage) return false

  try {
    storage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
