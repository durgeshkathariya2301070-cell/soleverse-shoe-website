export function normalizeProfilePhone(value) {
  return String(value ?? '').trim().replace(/[\s().-]/g, '')
}

export function validateProfilePhone(value) {
  const phone = normalizeProfilePhone(value)
  if (!phone) return ''
  if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
    return 'Enter a valid phone number with 7–15 digits. You may include a leading +.'
  }
  return ''
}
