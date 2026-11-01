import { supabase } from '../lib/supabaseClient.js'

const unavailable = 'Supabase is not configured.'

function deliveryError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  if (message.includes('delivery_response_already_recorded')) return 'You have already responded to this delivery notification.'
  if (message.includes('delivery_confirmation_not_current')) return 'This delivery confirmation is no longer current. Refresh your orders to see the latest status.'
  if (message.includes('invalid_delivery_response')) return 'Choose Yes or No to confirm the delivery.'
  if (message.includes('delivery_problem_report_not_available')) return 'A delivery problem report can only be sent after you select No.'
  if (message.includes('invalid_delivery_problem_report')) return 'Describe the delivery problem in 10 to 2,000 characters.'
  if (message.includes('delivery_notification_not_found') || message.includes('not_authorized')) return 'This delivery notification is not available for your account.'
  return 'The delivery confirmation could not be saved. Check your connection and try again.'
}

async function runDeliveryRequest(request) {
  if (!supabase) return { data: null, error: unavailable }
  try {
    const { data, error } = await request
    return error
      ? { data: null, error: deliveryError(error) }
      : { data, error: null }
  } catch (error) {
    console.warn('[delivery] request failed', error)
    return { data: null, error: deliveryError(error) }
  }
}

export function fetchMyDeliveryNotifications() {
  return runDeliveryRequest(supabase?.rpc('soleverse_customer_delivery_notifications'))
}

export function respondToDeliveryNotification(notificationId, received) {
  return runDeliveryRequest(supabase?.rpc('soleverse_customer_respond_delivery', {
    p_notification_id: notificationId,
    p_received: received,
  }))
}

export function reportDeliveryProblem(notificationId, report) {
  return runDeliveryRequest(supabase?.rpc('soleverse_customer_report_delivery_problem', {
    p_notification_id: notificationId,
    p_report: report,
  }))
}
