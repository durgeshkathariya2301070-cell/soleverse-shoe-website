// Reads and checks the two Supabase settings from the .env file.
// This file has no imports, so it can be tested without installing anything.

const PLACEHOLDER = /your[-_]|placeholder/i

// A "secret" key gives full access to the whole database. It must never be used in a website.
// Old-style keys are JWTs whose payload says role "service_role"; new-style ones start with "sb_secret_".
export function looksLikeSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)).role === 'service_role'
  } catch {
    return false
  }
}

// People often copy the "REST" address (https://abc.supabase.co/rest/v1/) instead of the project URL.
// The client library adds paths like /rest/v1 and /auth/v1 itself, so only the ORIGIN is wanted:
// https://abc.supabase.co. This keeps just that and drops everything after it.
export function normalizeSupabaseUrl(value) {
  try {
    const parsed = new URL(String(value ?? '').trim())
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && localHost)) return ''
    return parsed.origin
  } catch {
    return ''
  }
}

// env is import.meta.env. Returns { configured, url, key, problem }.
// `problem` is a plain-English sentence shown to the developer when the settings are not usable.
export function readSupabaseConfig(env = {}) {
  const url = String(env.VITE_SUPABASE_URL ?? '').trim()
  const key = String(env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const fail = (problem) => ({ configured: false, url: '', key: '', problem })

  if (!url || !key) {
    return fail('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Copy .env.example to .env, fill in both values from your Supabase project, then restart "npm run dev".')
  }
  if (PLACEHOLDER.test(url) || PLACEHOLDER.test(key)) {
    return fail('The values in .env are still the placeholders from .env.example. Replace them with the real values from your Supabase project, then restart "npm run dev".')
  }
  const origin = normalizeSupabaseUrl(url)
  if (!origin) {
    return fail('VITE_SUPABASE_URL must be a valid web address using HTTPS. HTTP is allowed only for a local Supabase host such as localhost.')
  }
  if (looksLikeSecretKey(key)) {
    return fail('VITE_SUPABASE_ANON_KEY looks like a SECRET key. Never put a secret or service_role key in a website. Use the public "anon" / "publishable" key instead.')
  }
  return { configured: true, url: origin, key, problem: '' }
}
