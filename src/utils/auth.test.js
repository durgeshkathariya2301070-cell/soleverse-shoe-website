// Tests for the account logic that needs no browser and no Supabase: form checks, friendly error
// messages, redirect safety and the .env checks. Run with:  npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSafeRedirect,
  normalizeFullName,
  validateEmail,
  validateFullName,
  validateLoginForm,
  validateNewPassword,
  validateSignupForm,
} from './authValidation.js'
import { friendlyAuthMessage, friendlyProfileMessage, NETWORK_MESSAGE } from './authErrors.js'
import { looksLikeSecretKey, readSupabaseConfig } from '../lib/supabaseConfig.js'
import { getPostLoginPath, resolveAdminAccess, shouldShowAdminDashboard } from './adminAccess.js'
import { normalizeProfilePhone, validateProfilePhone } from './profileValidation.js'

// ---- Form validation ----
test('email: empty and badly formed addresses are rejected, normal ones pass', () => {
  assert.match(validateEmail(''), /Enter your email/)
  assert.match(validateEmail('   '), /Enter your email/)
  for (const bad of ['ravi', 'ravi@', '@example.com', 'ravi@example', 'ra vi@example.com', 'a@b@c.com']) {
    assert.match(validateEmail(bad), /valid email/, bad)
  }
  assert.equal(validateEmail('ravi@example.com'), '')
  assert.equal(validateEmail('  ravi.kumar+shop@mail.example.co.in '), '')
  assert.match(validateEmail(`${'a'.repeat(250)}@x.com`), /too long/)
})

test('full name: required, trimmed, length limited', () => {
  assert.match(validateFullName(''), /Enter your full name/)
  assert.match(validateFullName('   '), /Enter your full name/)
  assert.equal(validateFullName('Ravi Kumar'), '')
  assert.match(validateFullName('a'.repeat(81)), /80 characters/)
  assert.equal(normalizeFullName('  Ravi    Kumar '), 'Ravi Kumar')
  assert.equal(normalizeFullName(undefined), '')
})

test('new password: 8 to 72 characters', () => {
  assert.match(validateNewPassword(''), /Choose a password/)
  assert.match(validateNewPassword('short'), /at least 8/)
  assert.equal(validateNewPassword('12345678'), '')
  assert.match(validateNewPassword('a'.repeat(73)), /72/)
})

test('sign-up form reports only the fields with problems', () => {
  const good = { fullName: 'Ravi Kumar', email: 'ravi@example.com', password: 'longenough1', confirmPassword: 'longenough1' }
  assert.deepEqual(validateSignupForm(good), {})
  assert.deepEqual(Object.keys(validateSignupForm({ fullName: '', email: 'x', password: '1', confirmPassword: '' })).sort(), [
    'confirmPassword',
    'email',
    'fullName',
    'password',
  ])
  assert.match(validateSignupForm({ ...good, confirmPassword: 'different1' }).confirmPassword, /do not match/)
})

test('log-in form only needs an email-shaped email and some password', () => {
  assert.deepEqual(validateLoginForm({ email: 'ravi@example.com', password: 'x' }), {})
  assert.deepEqual(Object.keys(validateLoginForm({ email: '', password: '' })).sort(), ['email', 'password'])
})

// ---- Redirect safety ----
test('after log in, only safe same-site paths are used', () => {
  assert.equal(getSafeRedirect(undefined), '/account')
  assert.equal(getSafeRedirect({ pathname: '/shop', search: '?q=aero', hash: '' }), '/shop?q=aero')
  assert.equal(getSafeRedirect({ pathname: '/account' }), '/account')
  assert.equal(getSafeRedirect('/product/aero-runner-01'), '/product/aero-runner-01')
  // Never leave the site, and never bounce back to the login or sign-up pages.
  assert.equal(getSafeRedirect('//evil.example'), '/account')
  assert.equal(getSafeRedirect('https://evil.example'), '/account')
  assert.equal(getSafeRedirect({ pathname: '//evil.example' }), '/account')
  assert.equal(getSafeRedirect({ pathname: '/login' }), '/account')
  assert.equal(getSafeRedirect({ pathname: '/signup' }), '/account')
  assert.equal(getSafeRedirect(42), '/account')
})

test('login redirects admins to admin and customers to the home page', () => {
  const adminAccess = resolveAdminAccess(true, null)
  const customerAccess = resolveAdminAccess(false, null)
  assert.equal(getPostLoginPath(adminAccess), '/admin')
  assert.equal(getPostLoginPath(adminAccess, '/orders'), '/admin')
  assert.equal(getPostLoginPath(customerAccess), '/')
  assert.equal(getPostLoginPath(customerAccess, '/orders'), '/orders')
})

test('admin access check errors do not authorize or choose a redirect', () => {
  const failedAccess = resolveAdminAccess(null, { message: 'RPC unavailable' })
  assert.equal(failedAccess, 'error')
  assert.equal(getPostLoginPath(failedAccess), null)
})

test('admin dashboard shortcut requires a current user and confirmed database authorization', () => {
  const user = { id: 'admin-user', user_metadata: { is_admin: true } }
  assert.equal(shouldShowAdminDashboard(user, false, { userId: user.id, status: 'allowed' }), true)
  assert.equal(shouldShowAdminDashboard(user, false, { userId: user.id, status: 'denied' }), false)
  assert.equal(shouldShowAdminDashboard(user, false, { userId: user.id, status: 'error' }), false)
  assert.equal(shouldShowAdminDashboard(user, false, { userId: 'another-user', status: 'allowed' }), false)
  assert.equal(shouldShowAdminDashboard(user, true, { userId: user.id, status: 'allowed' }), false)
  assert.equal(shouldShowAdminDashboard(null, false, { userId: null, status: 'allowed' }), false)
})

test('a non-admin reaching a protected admin route remains denied', () => {
  const customerAccess = resolveAdminAccess(false, null)
  assert.equal(customerAccess, 'denied')
  assert.equal(getPostLoginPath(customerAccess, getSafeRedirect({ pathname: '/admin' }, '/')), '/admin')
  assert.equal(getPostLoginPath(customerAccess), '/')
})

test('profile phone is optional, normalized and validated', () => {
  assert.equal(normalizeProfilePhone(' +91 (987) 654-3210 '), '+919876543210')
  assert.equal(validateProfilePhone(''), '')
  assert.equal(validateProfilePhone('+919876543210'), '')
  assert.match(validateProfilePhone('123'), /7–15 digits/)
  assert.match(validateProfilePhone('phone-number'), /7–15 digits/)
})

// ---- Friendly error messages ----
test('login and sign-up errors become plain sentences', () => {
  assert.match(friendlyAuthMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }), /don't match/)
  assert.match(friendlyAuthMessage({ message: 'Invalid login credentials' }), /don't match/)
  assert.match(friendlyAuthMessage({ code: 'email_not_confirmed' }), /isn't confirmed/)
  assert.match(friendlyAuthMessage({ code: 'user_already_exists' }, 'signup'), /already exists/)
  assert.match(friendlyAuthMessage({ message: 'User already registered' }, 'signup'), /already exists/)
  assert.match(friendlyAuthMessage({ code: 'weak_password' }, 'signup'), /too weak/)
  assert.match(friendlyAuthMessage({ status: 429, message: 'x' }), /Too many attempts/)
  assert.match(friendlyAuthMessage({ code: 'signup_disabled' }, 'signup'), /switched off/)
  assert.match(friendlyAuthMessage({ code: 'email_address_invalid', status: 400 }, 'signup'), /email address isn't accepted/)
  assert.match(friendlyAuthMessage({ code: 'invalid_api_key', status: 401 }, 'signup'), /project API key/)
  assert.match(friendlyAuthMessage({ status: 404 }, 'signup'), /authentication endpoint was not found/)
  assert.match(friendlyAuthMessage({ message: 'Database error saving new user', status: 500 }, 'signup'), /new-user database operation failed/)
  assert.match(friendlyAuthMessage({ message: 'Internal server error', status: 500 }, 'signup'), /HTTP 500/)
  assert.match(friendlyAuthMessage({ status: 422 }, 'signup'), /rejected the signup details/)
  assert.equal(friendlyAuthMessage(new TypeError('Failed to fetch')), NETWORK_MESSAGE)
  assert.equal(friendlyAuthMessage({ name: 'AuthRetryableFetchError', message: 'x', status: 0 }), NETWORK_MESSAGE)
})

test('unknown errors never leak technical text', () => {
  const secret = 'SELECT * FROM auth.users failed at 10.0.0.1'
  assert.equal(friendlyAuthMessage({ message: secret }, 'signup'), "We couldn't create your account. Please try again.")
  assert.equal(friendlyAuthMessage({ message: secret }, 'login'), "We couldn't log you in. Please try again.")
  assert.ok(!friendlyProfileMessage({ message: secret }, 'save').includes('10.0.0.1'))
  assert.ok(!friendlyAuthMessage(undefined).includes('undefined'))
})

test('profile errors point to the SQL step when the table or policies are missing', () => {
  assert.match(friendlyProfileMessage({ code: 'PGRST205' }), /SQL/)
  assert.match(friendlyProfileMessage({ code: '42P01' }), /SQL/)
  assert.match(friendlyProfileMessage({ code: '42501' }), /security policies/)
  assert.match(friendlyProfileMessage({ code: 'PGRST301' }), /expired/)
  assert.match(friendlyProfileMessage({ message: 'x' }, 'load'), /load your profile/)
  assert.match(friendlyProfileMessage({ message: 'x' }, 'save'), /save your profile/)
})

// ---- .env checks ----
// Builds a fake JWT (header.payload.signature) whose payload has the given role. No real key is involved.
const fakeJwt = (role) => {
  const part = (object) => Buffer.from(JSON.stringify(object)).toString('base64url')
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ role })}.signature`
}

test('.env: missing, placeholder and malformed values are refused with a helpful sentence', () => {
  assert.equal(readSupabaseConfig({}).configured, false)
  assert.match(readSupabaseConfig({}).problem, /missing/)
  assert.match(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }).problem, /missing/)
  const placeholders = readSupabaseConfig({
    VITE_SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',
  })
  assert.equal(placeholders.configured, false)
  assert.match(placeholders.problem, /placeholders/)
  assert.match(readSupabaseConfig({ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_ANON_KEY: 'k' }).problem, /valid web address/)
  assert.match(readSupabaseConfig({ VITE_SUPABASE_URL: 'ftp://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }).problem, /valid web address/)
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'k' }).configured, true)
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }).configured, true)
  assert.match(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }).problem, /valid web address using HTTPS/)
})

test('.env: a secret / service_role key is refused, a public key is accepted', () => {
  assert.equal(looksLikeSecretKey(fakeJwt('service_role')), true)
  assert.equal(looksLikeSecretKey(fakeJwt('anon')), false)
  assert.equal(looksLikeSecretKey('sb_secret_abc'), true)
  assert.equal(looksLikeSecretKey('sb_publishable_abc'), false)
  assert.equal(looksLikeSecretKey('not.a.jwt'), false)

  const url = 'https://abcdefgh.supabase.co'
  const secret = readSupabaseConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: fakeJwt('service_role') })
  assert.equal(secret.configured, false)
  assert.match(secret.problem, /SECRET/)

  const anon = readSupabaseConfig({ VITE_SUPABASE_URL: `  ${url} `, VITE_SUPABASE_ANON_KEY: fakeJwt('anon') })
  assert.equal(anon.configured, true)
  assert.equal(anon.url, url, 'surrounding spaces are trimmed')
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc123' }).configured, true)
})

test('.env: a project URL copied with /rest/v1/ on the end is reduced to the project address', () => {
  const key = fakeJwt('anon')
  for (const pasted of [
    'https://abc.supabase.co/rest/v1/',
    'https://abc.supabase.co/rest/v1',
    'https://abc.supabase.co/',
    '  https://abc.supabase.co/auth/v1/?x=1  ',
  ]) {
    const config = readSupabaseConfig({ VITE_SUPABASE_URL: pasted, VITE_SUPABASE_ANON_KEY: key })
    assert.equal(config.configured, true, pasted)
    assert.equal(config.url, 'https://abc.supabase.co', pasted)
  }
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: 'ftp://abc.supabase.co', VITE_SUPABASE_ANON_KEY: key }).configured, false)
})
