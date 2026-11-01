import { supabase } from '../lib/supabaseClient.js'
import { fromServerRows, toRpcItems } from '../utils/cart.js'

// Talks to the cart_items table for a logged-in customer. Row Level Security means each
// person can only ever read and change their OWN rows.
// Both functions return { items?, error } where error is the raw error (or null).

export async function fetchServerCart() {
  if (!supabase) return { items: [], error: new Error('Supabase is not configured') }
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, color_id, size, quantity')
    .order('created_at', { ascending: true })
  if (error) return { items: [], error }
  return { items: fromServerRows(data), error: null }
}

// Saves the whole bag in one all-or-nothing step (the replace_cart SQL function).
export async function replaceServerCart(items) {
  if (!supabase) return { error: new Error('Supabase is not configured') }
  const { error } = await supabase.rpc('replace_cart', { p_items: toRpcItems(items) })
  return { error: error ?? null }
}
