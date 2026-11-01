// "Place order" must never create two orders. Each checkout attempt carries a one-time key
// (an idempotency key) and the database returns the SAME order for the same key.
//
// The key is remembered in sessionStorage so that a refresh, a double click or a retry after a
// shaky connection reuses it. It is tied to a "fingerprint" of what is being ordered: if the bag,
// the address or the payment choice changes, a new key is made, so a changed order is never
// mistaken for the old one.

const STORAGE_KEY = 'soleverse-checkout-attempt-v1'

export function newKey() {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  // Very old browsers: build a version-4 UUID from random bytes.
  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// A short text that changes whenever anything about the order changes.
export function fingerprint({ userId, items, shipping, paymentMethod }) {
  const lines = [...items]
    .map((item) => `${item.product_id ?? item.productId}|${item.color_id ?? item.colorId}|${item.size}|${item.quantity}`)
    .sort()
  return JSON.stringify([userId, lines, shipping, paymentMethod])
}

// `store` is a Storage-like object ({getItem,setItem,removeItem}); it is injectable for tests.
export function getAttemptKey(print, store = globalThis.sessionStorage) {
  try {
    const saved = JSON.parse(store?.getItem(STORAGE_KEY) ?? 'null')
    if (saved && saved.print === print && typeof saved.key === 'string') return saved.key
  } catch {
    // unreadable storage: fall through and make a fresh key
  }
  const key = newKey()
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify({ print, key }))
  } catch {
    // storage blocked (private mode): the key still works for this one submit
  }
  return key
}

export function clearAttemptKey(store = globalThis.sessionStorage) {
  try {
    store?.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clear
  }
}
