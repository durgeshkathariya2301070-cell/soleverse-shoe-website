// Turns database / network errors into one calm sentence the shopper can act on.
// Returns { message, kind, field? }. `kind` lets the page decide what to do next:
//   'login' | 'stock' | 'invalid_shipping' | 'setup' | 'network' | 'empty' | 'unknown'

const text = (error) => `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()

const SHIPPING_FIELD_LABELS = {
  full_name: 'full name',
  phone: 'phone number',
  pin_code: 'PIN code',
  state: 'state',
  city: 'city',
  street: 'street address',
  landmark: 'landmark',
}
// database field name -> the form's field name
export const SHIPPING_FIELD_TO_FORM = {
  full_name: 'fullName',
  phone: 'phone',
  pin_code: 'pinCode',
  state: 'state',
  city: 'city',
  street: 'street',
  landmark: 'landmark',
}

export function friendlyOrderError(error) {
  const message = text(error)
  const detail = String(error?.details ?? '').trim()

  if (!error) return { kind: 'unknown', message: 'Something went wrong. Please try again.' }

  if (message.includes('not_authenticated') || error.status === 401 || error.code === 'PGRST301' || message.includes('jwt expired')) {
    return { kind: 'login', message: 'Your login has expired. Please log in again, your bag will still be here.' }
  }
  if (message.includes('empty_cart')) return { kind: 'empty', message: 'Your bag is empty.' }
  if (message.includes('insufficient_stock')) {
    return { kind: 'stock', message: 'Sorry, one of the pairs in your bag just sold out or has fewer left than you asked for. Please review your bag.' }
  }
  if (message.includes('demo_payment_amount_or_stock_changed') || message.includes('demo_payment_amount_changed')) {
    return { kind: 'stock', message: 'The price or available stock changed while the payment session was open. Return to checkout, review your bag, and start a new session.' }
  }
  if (message.includes('demo_payment_session_already_pending')) {
    return { kind: 'unknown', message: 'A payment session is already active for this checkout. Return to that session or wait for it to expire before starting another.' }
  }
  if (message.includes('demo_order_already_placed')) {
    return { kind: 'unknown', message: 'This checkout attempt already has a saved order. Check My Orders before starting another checkout.' }
  }
  if (message.includes('item_unavailable')) {
    return { kind: 'stock', message: 'One of the items in your bag is no longer available. Please remove it and try again.' }
  }
  if (message.includes('too_many_lines') || message.includes('invalid_items')) {
    return { kind: 'stock', message: 'Something is wrong with the items in your bag. Please review it and try again.' }
  }
  if (message.includes('invalid_payment_method')) {
    return { kind: 'invalid_shipping', message: 'Please choose a payment option.' }
  }
  if (message.includes('invalid_shipping')) {
    const label = SHIPPING_FIELD_LABELS[detail]
    return {
      kind: 'invalid_shipping',
      field: SHIPPING_FIELD_TO_FORM[detail],
      message: label ? `Please check your ${label}.` : 'Please check your delivery details.',
    }
  }
  if (message.includes('delivered_at')) {
    return {
      kind: 'setup',
      message: 'The order details schema is incomplete. Apply supabase/migrations/20261026000400_customer_delivery_confirmation.sql after the Phase 7 admin migration (see the README), then try again.',
    }
  }
  // The SQL files have not been run yet (or the API has not noticed them yet).
  if (
    message.includes('create_demo_payment_session') ||
    message.includes('finish_demo_payment_session') ||
    message.includes('demo_payment_sessions') ||
    message.includes('soleverse_admin_demo_payment_receipt')
  ) {
    return {
      kind: 'setup',
      message: 'Payment options are not set up in the database. In Supabase SQL Editor, apply the payment-method and payment-session migrations after the Phase 7 and customer-delivery migrations. No migration is applied automatically.',
    }
  }
  if (
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.code === '42883' ||
    message.includes('could not find the function') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  ) {
    return {
      kind: 'setup',
      message: 'Checkout is not set up in the database yet. Run the three Phase 6 SQL files in the Supabase SQL Editor (see the README), then try again.',
    }
  }
  if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed') || error.name === 'TypeError') {
    return { kind: 'network', message: "We couldn't reach the server. Check your internet connection and try again. If you already pressed Place order, it will not be charged twice." }
  }
  return { kind: 'unknown', message: 'We could not complete that. Please try again in a moment.' }
}
