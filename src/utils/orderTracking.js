export const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled']

export const ORDER_STATUS_LABELS = {
  placed: 'Order Placed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Delivered',
  cancelled: 'Cancelled',
}

const DELIVERY_MILESTONES = [
  { status: 'placed', label: 'Order Placed' },
  { status: 'processing', label: 'Processing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
]

export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] ?? 'Status unavailable'
}

export function getOrderTimeline(status) {
  const normalizedStatus = status === 'completed' ? 'delivered' : status
  const currentIndex = DELIVERY_MILESTONES.findIndex((milestone) => milestone.status === normalizedStatus)
  const isCancelled = status === 'cancelled'

  return DELIVERY_MILESTONES.map((milestone, index) => ({
    ...milestone,
    completed: currentIndex >= 0 && index <= currentIndex,
    current: !isCancelled && milestone.status === normalizedStatus,
    notRecorded: isCancelled,
  }))
}

export function isOrderReference(value) {
  return /^SV-[A-Z0-9]{8}$/.test(value ?? '')
}
