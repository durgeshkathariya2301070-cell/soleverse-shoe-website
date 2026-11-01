import { supabase } from '../lib/supabaseClient.js'

// The only file that talks to the "profiles" table. Both functions throw the Supabase error
// when something goes wrong, so the page can show a friendly message.
const COLUMNS = 'id, full_name, phone, pin_code, state, city, street, landmark, created_at, updated_at'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

async function authenticatedUserId() {
  const client = requireClient()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be logged in to access your profile.')
  return data.user.id
}

// Returns the signed-in user's profile row, or null if it does not exist yet.
// Row Level Security guarantees you can only ever read your own row.
export async function fetchProfile() {
  const userId = await authenticatedUserId()
  const { data, error } = await requireClient().from('profiles').select(COLUMNS).eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

// Saves personal details and the delivery address. "upsert" updates your row, or creates it if missing
// (for example an account made before the SQL was run). It can never create a second row for the same id.
export async function saveProfile({ fullName, phone, pinCode = '', state = '', city = '', street = '', landmark = '' }) {
  const userId = await authenticatedUserId()
  const { data, error } = await requireClient()
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName,
      phone: phone || null,
      pin_code: pinCode || null,
      state: state || null,
      city: city || null,
      street: street || null,
      landmark: landmark || null,
    }, { onConflict: 'id' })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}
