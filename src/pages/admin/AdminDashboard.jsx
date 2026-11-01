import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  IndianRupee,
  PackageCheck,
  PackageX,
  RefreshCw,
  ShoppingBag,
  Users,
} from 'lucide-react'
import Button from '../../components/Button.jsx'
import { fetchAdminDashboard } from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatPrice.js'
import {
  buildSalesSeries,
  calculateInventoryCounts,
  calculateOrderStatusCounts,
  rankTopSellingProducts,
  startDashboardRefresh,
} from '../../utils/adminDashboard.js'
import { getCategoryLabel } from '../../data/categories.js'
import { getOrderStatusLabel } from '../../utils/orderTracking.js'

const cards = [
  { key: 'total_sales_inr', label: 'Total sales · order value', icon: IndianRupee, format: formatPrice },
  { key: 'orders_today', label: 'Orders today', icon: ShoppingBag, format: (value) => value },
  { key: 'total_customers', label: 'Total customers', icon: Users, format: (value) => value },
  { key: 'total_products', label: 'Total products', icon: Boxes, format: (value) => value },
  { key: 'low_stock', label: 'Low stock variants', icon: PackageCheck, format: (value) => value },
  { key: 'out_of_stock', label: 'Out of stock variants', icon: PackageX, format: (value) => value },
]

const numberFormatter = new Intl.NumberFormat('en-IN')

function formatOrderDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
}

function formatUpdatedAt(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(value)
}

function getPaymentMethod(order) {
  if (order.demo_payment_method === 'demo_upi') return 'UPI QR'
  if (order.demo_payment_method === 'demo_card') return 'Card'
  return order.payment_method === 'cod' ? 'Cash on delivery' : 'Online payment'
}

function getPaymentStatus(order) {
  return order.payment_status === 'simulated' ? 'No payment received' : 'Due on delivery'
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 space-y-6" role="status" aria-label="Loading dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ key }) => (
          <div key={key} className="image-loading h-32 rounded-2xl border border-line" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="image-loading h-80 rounded-2xl border border-line" />
        <div className="image-loading h-80 rounded-2xl border border-line" />
      </div>
      <span className="sr-only">Loading dashboard data…</span>
    </div>
  )
}

function SalesChart({ salesByDay, period, onPeriodChange }) {
  const series = useMemo(() => buildSalesSeries(salesByDay, period), [salesByDay, period])
  const width = 640
  const height = 240
  const padding = 22
  const maxAmount = Math.max(...series.map((point) => point.amount_inr), 1)
  const points = series.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1)
    const y = height - padding - (point.amount_inr / maxAmount) * (height - padding * 2)
    return { ...point, x, y }
  })
  const line = points.map(({ x, y }) => `${x},${y}`).join(' ')
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="sales-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow text-muted">Order value</p>
          <h3 id="sales-heading" className="mt-2 text-2xl">Sales overview</h3>
          <p className="mt-2 text-xs text-muted">Order and COD value; no real payment receipts.</p>
        </div>
        <label className="text-sm text-muted">
          <span className="sr-only">Sales chart period</span>
          <select
            value={period}
            onChange={(event) => onPeriodChange(event.target.value)}
            className="rounded-full border border-line bg-white px-4 py-2 text-ink"
          >
            <option value="daily">Daily · 7 days</option>
            <option value="weekly">Weekly · 8 weeks</option>
            <option value="monthly">Monthly · 12 months</option>
          </select>
        </label>
      </div>
      <div className="mt-5">
        {salesByDay.some((point) => Number(point.amount_inr) > 0) ? (
          <>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold">
                {formatPrice(series.reduce((sum, point) => sum + point.amount_inr, 0))}
              </p>
              <span className="text-xs text-muted">order value</span>
            </div>
            <div className="mt-4">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-52 w-full overflow-visible"
                role="img"
                aria-label={`${period} order value chart`}
              >
                <defs>
                  <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d9ff64" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#d9ff64" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((lineIndex) => {
                  const y = padding + (lineIndex * (height - padding * 2)) / 3
                  return <line key={lineIndex} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e7e7e2" strokeDasharray="4 5" />
                })}
                <polygon points={area} fill="url(#sales-area)" />
                <polyline points={line} fill="none" stroke="#171717" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {points.map((point) => (
                  <circle key={point.key} cx={point.x} cy={point.y} r="4" fill="#171717">
                    <title>{`${point.label}: ${formatPrice(point.amount_inr)}`}</title>
                  </circle>
                ))}
              </svg>
              <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
                <span>{series[0]?.label}</span>
                <span>{series[Math.floor((series.length - 1) / 2)]?.label}</span>
                <span>{series.at(-1)?.label}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No sales data yet.</p>
        )}
      </div>
    </section>
  )
}

function InventoryStatus({ counts }) {
  const entries = [
    { key: 'in_stock', label: 'In stock', color: 'bg-lime' },
    { key: 'low_stock', label: 'Low stock · 1–5 pairs', color: 'bg-amber-400' },
    { key: 'out_of_stock', label: 'Out of stock', color: 'bg-red-400' },
  ]
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="inventory-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-muted">By size and colour variant</p>
          <h3 id="inventory-heading" className="mt-2 text-2xl">Inventory status</h3>
        </div>
        <Link to="/admin/inventory" className="eyebrow shrink-0 underline underline-offset-4">Manage inventory</Link>
      </div>
      {total ? (
        <div className="mt-7 space-y-5">
          {entries.map(({ key, label, color }) => {
            const count = counts[key]
            const width = `${(count / total) * 100}%`
            return (
              <div key={key}>
                <div className="flex justify-between gap-4 text-sm">
                  <span>{label}</span><span className="font-semibold">{numberFormatter.format(count)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                  <div className={`h-full rounded-full ${color}`} style={{ width }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-7 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No product variants yet.</p>
      )}
      <p className="mt-5 text-xs text-muted">Low stock means 1–5 pairs remaining; zero stock is counted separately.</p>
    </section>
  )
}

function OrderStatusChart({ statusRows }) {
  const statuses = useMemo(() => calculateOrderStatusCounts(statusRows), [statusRows])
  const total = statuses.reduce((sum, status) => sum + status.count, 0)
  const radius = 44
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="order-status-heading">
      <p className="eyebrow text-muted">All order records</p>
      <h3 id="order-status-heading" className="mt-2 text-2xl">Order status</h3>
      {total ? (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${total} orders by status`}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#e7e7e2" strokeWidth="12" />
              {statuses.filter((status) => status.count > 0).map((status) => {
                const length = (status.count / total) * circumference
                const currentOffset = offset
                offset += length
                return (
                  <circle
                    key={status.key}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={status.color}
                    strokeWidth="12"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-currentOffset}
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold">{numberFormatter.format(total)}</span>
              <span className="eyebrow text-muted">orders</span>
            </div>
          </div>
          <ul className="w-full space-y-2">
            {statuses.filter((status) => status.count > 0).map((status) => (
              <li key={status.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                  {status.label}
                </span>
                <span className="text-muted">{numberFormatter.format(status.count)} · {status.percentage.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No orders yet.</p>
      )}
    </section>
  )
}

function RecentOrders({ orders }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="recent-orders-heading">
      <div className="flex items-end justify-between gap-4">
        <div><p className="eyebrow text-muted">Latest activity</p><h3 id="recent-orders-heading" className="mt-2 text-2xl">Recent orders</h3></div>
        <Link to="/admin/orders" className="eyebrow underline underline-offset-4">View all</Link>
      </div>
      {orders.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[790px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="pb-3 pr-4">Order / customer</th>
                <th scope="col" className="pb-3 pr-4">Date</th>
                <th scope="col" className="pb-3 pr-4">Amount</th>
                <th scope="col" className="pb-3 pr-4">Payment</th>
                <th scope="col" className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0">
                  <td className="py-4 pr-4">
                    <Link className="font-semibold underline underline-offset-2" to={`/admin/orders/${order.id}`}>{order.reference}</Link>
                    <p className="mt-1 text-xs text-muted">{order.customer_name}</p>
                  </td>
                  <td className="py-4 pr-4">{formatOrderDate(order.created_at)}</td>
                  <td className="py-4 pr-4 font-medium">{formatPrice(order.total_inr)}</td>
                  <td className="py-4 pr-4">
                    <span>{getPaymentMethod(order)}</span>
                    <p className="mt-1 text-xs text-muted">{getPaymentStatus(order)}</p>
                  </td>
                  <td className="py-4">{getOrderStatusLabel(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No orders yet.</p>
      )}
    </section>
  )
}

function TopSellingProducts({ products }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="top-products-heading">
      <div>
        <p className="eyebrow text-muted">Ranked by valid order units</p>
        <h3 id="top-products-heading" className="mt-2 text-2xl">Top selling shoes</h3>
      </div>
      {products.length ? (
        <ol className="mt-5 divide-y divide-line">
          {products.map((product) => (
            <li key={product.product_id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-canvas object-cover" loading="lazy" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted" aria-hidden="true">
                  <ShoppingBag size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.name}</p>
                <p className="mt-1 text-xs text-muted">{getCategoryLabel(product.category)}</p>
                <p className="mt-1 text-xs text-muted">{numberFormatter.format(product.units_sold)} sold · {numberFormatter.format(product.available_stock)} in stock</p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{formatPrice(product.sales_value_inr)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No sales yet.</p>
      )}
    </section>
  )
}

export default function AdminDashboard() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '', updatedAt: null })
  const [period, setPeriod] = useState('daily')
  const activeRef = useRef(false)
  const inventory = useMemo(
    () => calculateInventoryCounts(state.data?.inventory_variants ?? []),
    [state.data?.inventory_variants],
  )
  const topProducts = useMemo(
    () => rankTopSellingProducts(state.data?.sales_by_product ?? []),
    [state.data?.sales_by_product],
  )

  const load = useCallback(async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setState((current) => current.data
        ? { ...current, error: '' }
        : { status: 'loading', data: null, error: '', updatedAt: null })
    }

    const { data, error } = await fetchAdminDashboard()
    if (!activeRef.current) return
    if (error) {
      setState((current) => current.data
        ? { ...current, error }
        : { status: 'error', data: null, error, updatedAt: null })
      return
    }
    setState({ status: 'ready', data, error: '', updatedAt: new Date() })
  }, [])

  useEffect(() => {
    activeRef.current = true
    void load(true)
    const stopRefresh = startDashboardRefresh(() => load(), {
      onError: () => setState((current) => ({
        ...current,
        error: 'Dashboard refresh failed. Check your connection and try again.',
      })),
    })
    return () => {
      activeRef.current = false
      stopRefresh()
    }
  }, [load])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted">SOLEVERSE · Operations overview</p>
          <h2 className="mt-2 text-4xl">Dashboard</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Live Supabase order and stock records. Totals are order values only, not money received.
          </p>
        </div>
        {state.updatedAt && (
          <p className="text-xs text-muted" aria-live="polite">
            Updated {formatUpdatedAt(state.updatedAt)}
          </p>
        )}
      </div>

      {state.status === 'loading' && <DashboardSkeleton />}
      {state.status === 'error' && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-white p-5" role="alert">
          <p>{state.error}</p>
          <Button className="mt-4" variant="outline" onClick={() => load(true)}>Try again</Button>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          {state.error && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm" role="alert">
              <p>{state.error} Showing the last successfully loaded data.</p>
              <Button variant="outline" onClick={() => load(true)}>Retry</Button>
            </div>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ key, label, icon: Icon, format }) => {
              const value = key === 'low_stock'
                ? inventory.low_stock
                : key === 'out_of_stock'
                  ? inventory.out_of_stock
                  : state.data[key] ?? 0
              return (
                <article key={key} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between text-muted">
                    <p className="eyebrow">{label}</p><Icon size={18} aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold">{format(value)}</p>
                  {key === 'total_sales_inr' && <p className="mt-2 text-xs text-muted">No real payments are processed.</p>}
                </article>
              )
            })}
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <SalesChart salesByDay={state.data.sales_by_day ?? []} period={period} onPeriodChange={setPeriod} />
            <InventoryStatus counts={inventory} />
            <TopSellingProducts products={topProducts} />
            <OrderStatusChart statusRows={state.data.order_status_counts ?? []} />
          </div>

          <div className="mt-6">
            <RecentOrders orders={state.data.recent_orders ?? []} />
          </div>
        </>
      )}
    </div>
  )
}
