export const SIMULATED_PAYMENT_NOTICE = 'PAYMENT NOTICE — No real money will be charged.'
export const DEMO_PAYMENT_DURATION_MS = 3 * 60 * 1000
export const DEMO_CARD_SUCCESS_NUMBER = '4242424242424242'
export const DEMO_CARD_FAILURE_NUMBER = '4000000000000002'
const SESSION_STORAGE_KEY = 'soleverse-demo-payment-session-v1'

export function newDemoSessionKey(cryptoApi = globalThis.crypto) {
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  throw new Error('Secure browser randomness is required to start a payment session.')
}

export function saveDemoSessionAttempt(attempt, store = globalThis.sessionStorage) {
  store?.setItem(SESSION_STORAGE_KEY, JSON.stringify(attempt))
}

export function getDemoSessionAttempt(store) {
  try {
    const storage = store ?? globalThis.sessionStorage
    const attempt = JSON.parse(storage?.getItem(SESSION_STORAGE_KEY) ?? 'null')
    if (
      attempt &&
      typeof attempt.sessionKey === 'string' &&
      typeof attempt.orderKey === 'string' &&
      ['demo_upi', 'demo_card'].includes(attempt.method) &&
      typeof attempt.fingerprint === 'string'
    ) return attempt
  } catch {
    return null
  }
  return null
}

export function clearDemoSessionAttempt(store) {
  try {
    const storage = store ?? globalThis.sessionStorage
    storage?.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Session persistence is best-effort; the database remains authoritative.
  }
}

export function makeDemoQrPayload(session) {
  return [
    'SOLEVERSE_DEMO_PAYMENT',
    `session=${session.session_reference}`,
    `order=${session.order_reference}`,
    `amount_inr=${session.amount_inr}`,
    'simulation_only=true',
    'not_a_upi_payment_request=true',
  ].join('|')
}

export function remainingDemoSessionMs(session, now = Date.now()) {
  const expiry = Date.parse(session?.expires_at)
  const serverNow = Date.parse(session?.server_now)
  if (!Number.isFinite(expiry) || !Number.isFinite(serverNow)) return 0
  const received = Number(session.received_at_client)
  const elapsed = Number.isFinite(received) ? Math.max(0, now - received) : 0
  return Math.max(0, expiry - serverNow - elapsed)
}

export function formatDemoCountdown(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatDemoCardNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export function detectDemoCardNetwork(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (/^4/.test(digits)) return 'Visa (test)'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard (test)'
  return digits ? 'Test card' : 'Card network'
}

function isValidExpiry(value, now = new Date()) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

export function validateDemoCard({ number, name, expiry, cvv }, now = new Date()) {
  const digits = String(number ?? '').replace(/\D/g, '')
  const errors = {}
  if (![DEMO_CARD_SUCCESS_NUMBER, DEMO_CARD_FAILURE_NUMBER].includes(digits)) {
    errors.number = 'Use one of the documented test numbers shown below. Never enter a real card.'
  }
  if (String(name ?? '').trim().length < 2) errors.name = 'Enter a cardholder name to continue.'
  if (!isValidExpiry(String(expiry ?? ''), now)) errors.expiry = 'Enter a valid future expiry date (MM/YY).'
  if (!/^\d{3,4}$/.test(String(cvv ?? ''))) errors.cvv = 'Enter a 3 or 4 digit test security code.'
  return errors
}

export function demoCardOutcome(number) {
  const digits = String(number ?? '').replace(/\D/g, '')
  if (digits === DEMO_CARD_SUCCESS_NUMBER) return 'success'
  if (digits === DEMO_CARD_FAILURE_NUMBER) return 'failure'
  return null
}

export async function runDemoPaymentSimulation(outcome, confirmSession, wait = () => new Promise((resolve) => setTimeout(resolve, 900))) {
  if (outcome !== 'success' && outcome !== 'failure') {
    throw new Error('Choose a valid payment outcome.')
  }
  await wait()
  return confirmSession(outcome)
}
