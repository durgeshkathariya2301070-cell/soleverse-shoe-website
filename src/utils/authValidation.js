// Form checks for the sign-up, log-in and account pages. Each function returns an error
// message, or an empty string when the value is fine. No imports, so they are easy to test.

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72 // Supabase only uses the first 72 characters
export const NAME_MAX_LENGTH = 80
export const EMAIL_MAX_LENGTH = 254

// "Ravi   Kumar " -> "Ravi Kumar"
export const normalizeFullName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')
export const normalizeEmail = (value) => String(value ?? '').trim()

export function validateEmail(value) {
  const email = normalizeEmail(value)
  if (!email) return 'Enter your email address.'
  if (email.length > EMAIL_MAX_LENGTH) return 'That email address is too long.'
  // Simple on purpose: something@something.something with no spaces. Supabase does the final check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address, like name@example.com.'
  return ''
}

export function validateFullName(value) {
  const name = normalizeFullName(value)
  if (!name) return 'Enter your full name.'
  if (name.length > NAME_MAX_LENGTH) return `Use ${NAME_MAX_LENGTH} characters or fewer.`
  return ''
}

// Rules for CHOOSING a password (sign up).
export function validateNewPassword(value) {
  const password = String(value ?? '')
  if (!password) return 'Choose a password.'
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`
  return ''
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Type your password again to confirm it.'
  if (password !== confirm) return 'The two passwords do not match.'
  return ''
}

// Each validate*Form returns an object with ONLY the fields that have a problem, e.g. { email: '...' }.
// An empty object means the form is valid.
function onlyProblems(checks) {
  return Object.fromEntries(Object.entries(checks).filter(([, message]) => message))
}

export function validateSignupForm({ fullName, email, password, confirmPassword }) {
  return onlyProblems({
    fullName: validateFullName(fullName),
    email: validateEmail(email),
    password: validateNewPassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  })
}

export function validateLoginForm({ email, password }) {
  return onlyProblems({
    email: validateEmail(email),
    // When logging in we only need something typed: the server decides if it is correct.
    password: password ? '' : 'Enter your password.',
  })
}

// After logging in, send people back to the page they wanted. `from` is the location the router
// remembered (an object with pathname/search/hash). Only same-site paths are accepted, and
// never the login or sign-up pages themselves (that would loop).
export function getSafeRedirect(from, fallback = '/account') {
  const pathname = typeof from === 'string' ? from : from?.pathname
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) return fallback
  if (pathname === '/login' || pathname === '/signup') return fallback
  if (typeof from === 'string') return from
  return `${pathname}${from.search ?? ''}${from.hash ?? ''}`
}
