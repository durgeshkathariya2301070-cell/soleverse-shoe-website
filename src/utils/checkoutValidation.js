// Checks for the delivery details on the checkout form. Each validate* function returns an error
// message, or '' when the value is fine. No imports except the state list, so it is easy to test.
// The database repeats these checks: the browser is never trusted on its own.
import { INDIAN_STATES } from '../data/indianStates.js'

export const squash = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')

// "+91 98765-43210", "098765 43210", "919876543210" -> "9876543210". Anything else is returned as digits only.
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/[\s\-().]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

export const LIMITS = { name: [2, 80], city: [2, 60], street: [5, 200], landmarkMax: 100 }

export function validateFullName(value) {
  const name = squash(value)
  if (!name) return 'Enter the full name of the person receiving the order.'
  if (name.length < LIMITS.name[0]) return 'That name is too short.'
  if (name.length > LIMITS.name[1]) return `Use ${LIMITS.name[1]} characters or fewer.`
  return ''
}

export function validatePhone(value) {
  const phone = normalizePhone(value)
  if (!phone) return 'Enter a mobile number so the courier can reach you.'
  if (!/^[6-9][0-9]{9}$/.test(phone)) return 'Enter a valid 10-digit Indian mobile number, starting with 6, 7, 8 or 9.'
  return ''
}

export function validatePinCode(value) {
  const pin = String(value ?? '').trim()
  if (!pin) return 'Enter your 6-digit PIN code.'
  if (!/^[1-9][0-9]{5}$/.test(pin)) return 'A PIN code is 6 digits and does not start with 0.'
  return ''
}

export function validateState(value) {
  if (!String(value ?? '').trim()) return 'Choose your state.'
  if (!INDIAN_STATES.includes(String(value).trim())) return 'Choose a state from the list.'
  return ''
}

export function validateCity(value) {
  const city = squash(value)
  if (!city) return 'Enter your city or town.'
  if (city.length < LIMITS.city[0]) return 'That city name is too short.'
  if (city.length > LIMITS.city[1]) return `Use ${LIMITS.city[1]} characters or fewer.`
  return ''
}

export function validateStreet(value) {
  const street = squash(value)
  if (!street) return 'Enter your street address (house number, building, street).'
  if (street.length < LIMITS.street[0]) return 'Please give a fuller address, with house number and street.'
  if (street.length > LIMITS.street[1]) return `Use ${LIMITS.street[1]} characters or fewer.`
  return ''
}

// The landmark is optional: empty is fine.
export function validateLandmark(value) {
  if (squash(value).length > LIMITS.landmarkMax) return `Use ${LIMITS.landmarkMax} characters or fewer.`
  return ''
}

// Returns { fullName: 'message', ... } with ONLY the fields that have a problem. {} means all good.
export function validateShipping(values) {
  const checks = {
    fullName: validateFullName(values.fullName),
    phone: validatePhone(values.phone),
    pinCode: validatePinCode(values.pinCode),
    state: validateState(values.state),
    city: validateCity(values.city),
    street: validateStreet(values.street),
    landmark: validateLandmark(values.landmark),
  }
  return Object.fromEntries(Object.entries(checks).filter(([, message]) => message))
}

// Form values -> the object sent to the database function (tidy spacing, 10-digit phone).
export function toShippingPayload(values) {
  return {
    full_name: squash(values.fullName),
    phone: normalizePhone(values.phone),
    pin_code: String(values.pinCode ?? '').trim(),
    state: String(values.state ?? '').trim(),
    city: squash(values.city),
    street: squash(values.street),
    landmark: squash(values.landmark),
  }
}
