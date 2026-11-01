export const ADMIN_ORDER_FILTERS = [
  { key: 'all', label: 'All orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Confirmed / Processing' },
  { key: 'shipped', label: 'Shipped / Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

export const ADMIN_ORDERS_PAGE_SIZE = 25

export function getAdminOrderFilterKey(status) {
  if (status === 'placed') return 'pending'
  if (status === 'processing') return 'processing'
  if (status === 'shipped' || status === 'out_for_delivery') return 'shipped'
  if (status === 'delivered' || status === 'completed') return 'delivered'
  if (status === 'cancelled') return 'cancelled'
  return null
}

export function filterAdminOrders(orders, filter = 'all', search = '') {
  const query = String(search ?? '').trim().toLocaleLowerCase()
  return orders.filter((order) => {
    if (filter !== 'all' && getAdminOrderFilterKey(order.status) !== filter) return false
    if (!query) return true

    return [
      order.reference,
      order.customer_name,
      order.customer_email,
      order.phone,
    ].some((value) => String(value ?? '').toLocaleLowerCase().includes(query))
  })
}

export function paginateAdminOrders(orders, page, pageSize = ADMIN_ORDERS_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const start = (currentPage - 1) * pageSize
  return {
    items: orders.slice(start, start + pageSize),
    currentPage,
    pageCount,
    start,
    end: Math.min(start + pageSize, orders.length),
  }
}

export function createOrderActionLock() {
  let locked = false
  return {
    acquire() {
      if (locked) return false
      locked = true
      return true
    },
    release() {
      locked = false
    },
  }
}
