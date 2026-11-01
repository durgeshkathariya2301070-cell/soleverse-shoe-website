export const LOW_STOCK_THRESHOLD = 5
export const DASHBOARD_TIME_ZONE = 'Asia/Kolkata'

export async function resolveAdminRequest(request) {
  try {
    const { data, error } = await request
    if (error) {
      return {
        data: null,
        error: 'The request could not be completed. Check the required Supabase migrations and your administrator access.',
      }
    }
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: 'The request could not be completed. Check your connection and administrator access.',
    }
  }
}

const ORDER_STATUS_GROUPS = [
  { key: 'placed', label: 'Pending', color: '#eab308' },
  { key: 'processing', label: 'Processing', color: '#8b5cf6' },
  { key: 'in_transit', label: 'In transit', color: '#3b82f6' },
  { key: 'delivered', label: 'Delivered', color: '#22c55e' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
]

function datePartsInTimeZone(value, timeZone = DASHBOARD_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  return Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
}

export function getDateInTimeZone(value, timeZone = DASHBOARD_TIME_ZONE) {
  const parts = datePartsInTimeZone(value, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function countOrdersToday(orders, now = new Date(), timeZone = DASHBOARD_TIME_ZONE) {
  const today = getDateInTimeZone(now, timeZone)
  return orders.filter((order) => getDateInTimeZone(new Date(order.created_at), timeZone) === today).length
}

export function calculateInventoryCounts(variants, threshold = LOW_STOCK_THRESHOLD) {
  return variants.reduce((counts, variant) => {
    if (variant.stock === 0) counts.out_of_stock += 1
    else if (variant.stock <= threshold) counts.low_stock += 1
    else counts.in_stock += 1
    return counts
  }, { in_stock: 0, low_stock: 0, out_of_stock: 0 })
}

export function rankTopSellingProducts(products, limit = 5) {
  return [...products]
    .filter((product) => product.units_sold > 0)
    .sort((a, b) => b.units_sold - a.units_sold || b.sales_value_inr - a.sales_value_inr)
    .slice(0, limit)
}

export function calculateOrderStatusCounts(statusRows) {
  const counts = Object.fromEntries(ORDER_STATUS_GROUPS.map(({ key }) => [key, 0]))

  for (const row of statusRows) {
    const key = row.status === 'completed'
      ? 'delivered'
      : row.status === 'shipped' || row.status === 'out_for_delivery'
        ? 'in_transit'
        : row.status
    if (Object.hasOwn(counts, key)) counts[key] += Number(row.count) || 0
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  return ORDER_STATUS_GROUPS.map((group) => ({
    ...group,
    count: counts[group.key],
    percentage: total ? (counts[group.key] / total) * 100 : 0,
  }))
}

function localDateFromIso(date) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function buildSalesSeries(salesByDay, period = 'daily', now = new Date()) {
  const today = localDateFromIso(getDateInTimeZone(now))
  const sales = new Map(salesByDay.map(({ date, amount_inr }) => [date, Number(amount_inr) || 0]))

  if (period === 'monthly') {
    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11 + index, 1))
      const month = monthDate.getUTCMonth()
      const year = monthDate.getUTCFullYear()
      const value = [...sales].reduce((sum, [date, amount]) => {
        const saleDate = localDateFromIso(date)
        return saleDate.getUTCFullYear() === year && saleDate.getUTCMonth() === month ? sum + amount : sum
      }, 0)
      return {
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(monthDate),
        amount_inr: value,
      }
    })
  }

  if (period === 'weekly') {
    const monday = new Date(today)
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
    const firstMonday = new Date(monday)
    firstMonday.setUTCDate(firstMonday.getUTCDate() - 7 * 7)
    return Array.from({ length: 8 }, (_, index) => {
      const start = new Date(firstMonday)
      start.setUTCDate(start.getUTCDate() + index * 7)
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 7)
      const amount = [...sales].reduce((sum, [date, value]) => {
        const saleDate = localDateFromIso(date)
        return saleDate >= start && saleDate < end ? sum + value : sum
      }, 0)
      return {
        key: isoDate(start),
        label: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(start),
        amount_inr: amount,
      }
    })
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - 6 + index)
    return {
      key: isoDate(date),
      label: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(date),
      amount_inr: sales.get(isoDate(date)) ?? 0,
    }
  })
}

export function startDashboardRefresh(refresh, {
  intervalMs = 30_000,
  windowTarget = window,
  documentTarget = document,
  onError = () => {},
} = {}) {
  let active = true
  let inFlight = false

  const refreshSafely = async () => {
    if (!active || inFlight) return
    inFlight = true
    try {
      await refresh()
    } catch (error) {
      onError(error)
    } finally {
      inFlight = false
    }
  }
  const onVisible = () => {
    if (documentTarget.visibilityState === 'visible') void refreshSafely()
  }

  const intervalId = windowTarget.setInterval(() => void refreshSafely(), intervalMs)
  windowTarget.addEventListener('focus', onVisible)
  documentTarget.addEventListener('visibilitychange', onVisible)

  return () => {
    active = false
    windowTarget.clearInterval(intervalId)
    windowTarget.removeEventListener('focus', onVisible)
    documentTarget.removeEventListener('visibilitychange', onVisible)
  }
}
