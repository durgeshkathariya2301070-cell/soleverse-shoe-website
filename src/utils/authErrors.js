// Turns the technical errors from Supabase into short, friendly sentences.
// Supabase errors carry a `code` (best to match on), a `message` and sometimes a `status`.

export const NOT_CONFIGURED_MESSAGE =
  'Accounts are not set up yet. The site owner needs to add the Supabase settings to the .env file.'

export const NETWORK_MESSAGE =
  "The browser couldn't reach Supabase Auth for this request, so it received no HTTP response. Check the browser's Network and Console panels for DNS, proxy, extension, or browser blocking, then try again."

function isNetworkError(error) {
  const text = String(error?.message ?? '').toLowerCase()
  return (
    error?.name === 'AuthRetryableFetchError' ||
    error?.status === 0 ||
    /failed to fetch|networkerror|network request failed|load failed/.test(text)
  )
}

// context: 'login' or 'signup' (only changes the fallback sentence)
export function friendlyAuthMessage(error, context = 'login') {
  const code = String(error?.code ?? '').toLowerCase()
  const text = String(error?.message ?? '').toLowerCase()

  if (isNetworkError(error)) return NETWORK_MESSAGE
  if (
    code === 'invalid_api_key' ||
    code === 'no_authorization' ||
    text.includes('invalid api key') ||
    text.includes('api key is invalid')
  ) {
    return 'Supabase rejected the project API key. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY belong to the same project.'
  }
  if (error?.status === 404) {
    return 'The Supabase authentication endpoint was not found. Check the project URL in VITE_SUPABASE_URL.'
  }
  if (code === 'invalid_credentials' || text.includes('invalid login credentials')) {
    return "That email and password don't match. Check them and try again."
  }
  if (code === 'email_not_confirmed' || text.includes('email not confirmed')) {
    return "Your email isn't confirmed yet. Open the confirmation email we sent you, click the link, then log in."
  }
  if (code === 'user_already_exists' || code === 'email_exists' || text.includes('already registered')) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (code === 'weak_password' || text.includes('password should be') || text.includes('weak password')) {
    return 'That password is too weak. Use at least 8 characters and avoid common passwords.'
  }
  if (code === 'signup_disabled' || text.includes('signups not allowed')) {
    return 'New sign-ups are switched off for this site right now.'
  }
  if (code === 'email_provider_disabled' || text.includes('email signups are disabled')) {
    return 'Email sign-up is disabled for this Supabase project. The site owner needs to enable the email provider in Supabase Auth settings.'
  }
  if (code === 'email_address_invalid' || text.includes('invalid email') || text.includes('email address is invalid')) {
    return "That email address isn't accepted. Check it for typos."
  }
  if (
    /rate_limit/.test(code) ||
    code === 'over_email_send_rate_limit' ||
    error?.status === 429 ||
    text.includes('rate limit')
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }
  if (/database error saving new user|error creating user/.test(text)) {
    return 'Supabase reached the signup request, but its new-user database operation failed. Check Supabase Auth logs and the database trigger logs; do not rerun migrations unless the logs identify a missing database object.'
  }
  if (error?.status >= 500) {
    return `Supabase returned a server error while creating your account (HTTP ${error.status}). Check the Supabase Auth logs for the cause.`
  }
  if (error?.status === 401 || error?.status === 403) {
    return `Supabase refused the signup request (HTTP ${error.status}). Check the project's Auth settings and public API key configuration.`
  }
  if (error?.status === 422 || code === 'validation_failed') {
    return 'Supabase rejected the signup details. Check the email address and password requirements, then try again.'
  }
  return context === 'signup'
    ? "We couldn't create your account. Please try again."
    : "We couldn't log you in. Please try again."
}

// For errors from the profiles table. action: 'load' or 'save'.
export function friendlyProfileMessage(error, action = 'load') {
  const code = error?.code ?? ''
  const text = String(error?.message ?? '').toLowerCase()

  if (isNetworkError(error)) return NETWORK_MESSAGE
  if (code === 'PGRST205' || code === '42P01' || text.includes('could not find the table') || text.includes('does not exist')) {
    return 'The profiles table was not found. Run the SQL file in supabase/migrations in your Supabase SQL Editor (see the README), then try again.'
  }
  if (code === 'PGRST204' || code === '42703' || text.includes('column') && text.includes('profiles')) {
    return 'The profile fields are not available in the database yet. Apply the latest profile-fields migration from supabase/migrations, then try again.'
  }
  if (code === '42501' || text.includes('row-level security') || text.includes('permission denied')) {
    return 'The database refused this request. Check that the security policies from the SQL file were created.'
  }
  if (code === '23514') return 'That name is not allowed. Try a shorter one.'
  if (code === 'PGRST301' || code === 'PGRST303' || text.includes('jwt')) {
    return 'Your login has expired. Please log in again.'
  }
  return action === 'save' ? "We couldn't save your profile. Please try again." : "We couldn't load your profile. Please try again."
}
