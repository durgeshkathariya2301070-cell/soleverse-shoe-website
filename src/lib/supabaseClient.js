import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig.js'

// The one Supabase connection used by the whole site.
// The URL and public key come from the .env file (see .env.example). They are PUBLIC values:
// what keeps data safe is Row Level Security in the database, not hiding this key.
const config = readSupabaseConfig(import.meta.env)

// When the settings are missing, `supabase` is null and the site still works.
// The login and sign-up pages then explain what to set up instead of crashing.
export const isSupabaseConfigured = config.configured
export const supabaseSetupProblem = config.problem

export const supabase = config.configured
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true, // keep the login in the browser, so a page refresh does not log you out
        autoRefreshToken: true, // renew the login before it expires
        detectSessionInUrl: true, // lets the link in the confirmation email log you in
      },
    })
  : null
