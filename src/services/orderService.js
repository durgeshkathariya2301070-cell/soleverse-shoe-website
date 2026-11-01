import { supabase } from '../lib/supabaseClient.js'
import { toRpcItems } from '../utils/cart.js'
import { friendlyOrderError } from '../utils/orderErrors.js'

// Talks to the database about orders. The browser sends WHAT was chosen (shoe, colour, size,
// quantity) and WHERE to deliver. It never sends a price: the database looks prices up itself.
// Every function returns { data, error } where error is { message, kind, field? } or null.

const notConfigured = { kind: 'setup', message: 'The shop is not connected to its database yet. Add your Supabase settings to .env (see the README).' }
const isMissingDemoSessionTable = (error) =>
  error?.code === 'PGRST205' || error?.code === '42P01'

// "What would this bag cost right now?" Read-only, so it is safe to call as often as needed.
export async function quoteOrder(items) {
  if (!supabase) return { data: null, error: notConfigured }
  try {
    const { data, error } = await supabase.rpc('quote_order', { p_items: toRpcItems(items) })
    if (error) return { data: null, error: friendlyOrderError(error) }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: friendlyOrderError(error) }
  }
}

// Creates the order. The same idempotencyKey always returns the same order, never a second one.
export async function placeOrderWithClient(client, { idempotencyKey, items, shipping, paymentMethod }) {
  if (!client) return { data: null, error: notConfigured }
  try {
    const { data, error } = await client.rpc('place_order', {
      p_idempotency_key: idempotencyKey,
      p_items: toRpcItems(items),
      p_shipping: shipping,
      p_payment_method: paymentMethod,
    })
    if (error) return { data: null, error: friendlyOrderError(error) }
    if (
      !data ||
      typeof data.order_id !== 'string' ||
      !/^SV-[A-Z0-9]{8}$/.test(data.reference) ||
      !Number.isInteger(data.total_inr) ||
      data.total_inr <= 0 ||
      typeof data.reused !== 'boolean'
    ) {
      return {
        data: null,
        error: {
          kind: 'unknown',
          message: "We couldn't confirm that your order was saved. Your bag is still here. Please try again; repeating this checkout attempt won't create a duplicate.",
        },
      }
    }
    return {
      data: { orderId: data.order_id, reference: data.reference, totalInr: data.total_inr, reused: data.reused },
      error: null,
    }
  } catch (error) {
    return { data: null, error: friendlyOrderError(error) }
  }
}

export function placeOrder(args) {
  return placeOrderWithClient(supabase, args)
}

function mapDemoSession(data) {
  if (!data || typeof data.id !== 'string' || typeof data.session_reference !== 'string') return null
  return {
    id: data.id,
    session_reference: data.session_reference,
    order_reference: data.order_reference,
    demo_method: data.demo_method,
    amount_inr: data.amount_inr,
    status: data.status,
    created_at: data.created_at,
    expires_at: data.expires_at,
    transaction_reference: data.transaction_reference,
    transaction_at: data.transaction_at,
    order_id: data.order_id,
    server_now: data.server_now,
    received_at_client: Date.now(),
  }
}

export async function createDemoPaymentSessionWithClient(client, { sessionKey, orderKey, items, shipping, paymentMethod }) {
  if (!client) return { data: null, error: notConfigured }
  try {
    const { data, error } = await client.rpc('create_demo_payment_session', {
      p_session_key: sessionKey,
      p_order_idempotency_key: orderKey,
      p_items: toRpcItems(items),
      p_shipping: shipping,
      p_demo_method: paymentMethod,
    })
    if (error) return { data: null, error: friendlyOrderError(error) }
    const session = mapDemoSession(data)
    const createdAt = Date.parse(session?.created_at)
    const expiresAt = Date.parse(session?.expires_at)
    if (
      !session ||
      session.demo_method !== paymentMethod ||
      !Number.isInteger(session.amount_inr) ||
      !Number.isFinite(Date.parse(session.server_now)) ||
      !Number.isFinite(createdAt) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= createdAt ||
      expiresAt - createdAt > 3 * 60 * 1000 + 5000
    ) {
      return { data: null, error: { kind: 'unknown', message: 'The payment session response was invalid. Please try again.' } }
    }
    return { data: session, error: null }
  } catch (error) {
    return { data: null, error: friendlyOrderError(error) }
  }
}

export function createDemoPaymentSession(args) {
  return createDemoPaymentSessionWithClient(supabase, args)
}

export async function finishDemoPaymentSessionWithClient(client, { sessionId, result }) {
  if (!client) return { data: null, error: notConfigured }
  try {
    const { data, error } = await client.rpc('finish_demo_payment_session', {
      p_session_id: sessionId,
      p_result: result,
    })
    if (error) return { data: null, error: friendlyOrderError(error) }
    const session = mapDemoSession({
      ...data,
      id: sessionId,
      session_reference: data.session_reference,
      order_reference: data.order_reference,
      created_at: null,
      expires_at: null,
      server_now: data.server_now,
    })
    if (!session || !['completed', 'failed', 'expired', 'cancelled'].includes(session.status)) {
      return { data: null, error: { kind: 'unknown', message: 'The payment result could not be confirmed by the database.' } }
    }
    return {
      data: {
        ...session,
        reused: data.reused === true,
        reference: data.order_reference,
        receipt: {
          order_reference: data.order_reference,
          session_reference: data.session_reference,
          transaction_reference: data.transaction_reference,
          transaction_at: data.transaction_at,
          amount_inr: data.amount_inr,
          demo_method: data.demo_method,
          status: data.status,
        },
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: friendlyOrderError(error) }
  }
}

export function finishDemoPaymentSession(args) {
  return finishDemoPaymentSessionWithClient(supabase, args)
}

// Loads one of the logged-in customer's own orders (Row Level Security hides everyone else's).
export async function fetchOrderByReference(reference) {
  if (!supabase) return { data: null, error: notConfigured }
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, reference, created_at, status, delivered_at, payment_method, payment_status, demo_payment_method, subtotal_inr, delivery_fee_inr, total_inr, ship_full_name, ship_phone, ship_pin_code, ship_state, ship_city, ship_street, ship_landmark, order_items(id, product_id, product_name, color_id, color_label, size, unit_price_inr, quantity, line_total_inr)')
      .eq('reference', reference)
      .maybeSingle()
    if (error) return { data: null, error: friendlyOrderError(error) }
    if (!data) return { data: null, error: null }
    let demoSession = null
    if (data.payment_method === 'simulated_online' && data.demo_payment_method) {
      const { data: session, error: sessionError } = await supabase
        .from('demo_payment_sessions')
        .select('session_reference, transaction_reference, transaction_at, amount_inr, demo_method, status')
        .eq('order_id', data.id)
        .eq('status', 'completed')
        .maybeSingle()
      if (sessionError && !isMissingDemoSessionTable(sessionError)) {
        return { data: null, error: friendlyOrderError(sessionError) }
      }
      demoSession = session ?? null
    }
    return {
      data: {
        ...data,
        demo_transaction: demoSession ? {
          ...demoSession,
          order_reference: data.reference,
        } : null,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: friendlyOrderError(error) }
  }
}

// RLS restricts this query to the authenticated customer's own orders. Do not add a client-supplied
// user_id filter as an authorization mechanism; the database policy checks auth.uid().
export async function fetchMyOrders() {
  if (!supabase) return { data: null, error: notConfigured }
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, reference, created_at, status, total_inr, payment_method, payment_status, demo_payment_method, order_items(id, product_name, color_label, size, quantity, unit_price_inr, line_total_inr)')
      .order('created_at', { ascending: false })
    if (error) return { data: null, error: friendlyOrderError(error) }
    const orders = data ?? []
    const onlineOrderIds = orders
      .filter((order) => order.payment_method === 'simulated_online' && order.demo_payment_method)
      .map((order) => order.id)
    if (onlineOrderIds.length === 0) return { data: orders, error: null }
    const { data: sessions, error: sessionError } = await supabase
      .from('demo_payment_sessions')
      .select('order_id, session_reference, transaction_reference, transaction_at, amount_inr, demo_method, status')
      .in('order_id', onlineOrderIds)
      .eq('status', 'completed')
    if (sessionError && !isMissingDemoSessionTable(sessionError)) {
      return { data: null, error: friendlyOrderError(sessionError) }
    }
    const sessionByOrder = new Map((sessions ?? []).map((session) => [session.order_id, session]))
    return {
      data: orders.map((order) => ({
        ...order,
        demo_transaction: sessionByOrder.get(order.id) ?? null,
      })),
      error: null,
    }
  } catch (error) {
    return { data: null, error: friendlyOrderError(error) }
  }
}
