export function paymentMethodLabel(order) {
  if (order?.payment_method === 'cod') return 'Cash on Delivery (COD)'
  if (order?.demo_payment_method === 'demo_upi') return 'UPI QR'
  if (order?.demo_payment_method === 'demo_card') return 'Credit/Debit Card'
  if (order?.payment_method === 'simulated_online') return 'Online payment'
  return 'Payment method unavailable'
}

export function paymentStatusLabel(order) {
  if (order?.payment_method === 'cod' && order.payment_status === 'due_on_delivery') {
    return 'COD pending — due on delivery'
  }
  if (order?.payment_method === 'simulated_online' && order.payment_status === 'simulated') {
    return 'No payment received'
  }
  return 'Payment status unavailable'
}

export function demoTransactionTimestamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Timestamp unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
