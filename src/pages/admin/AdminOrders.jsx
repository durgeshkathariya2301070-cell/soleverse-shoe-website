import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import { fetchAdminOrders, updateAdminOrderStatus } from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatPrice.js'
import { getOrderStatusLabel } from '../../utils/orderTracking.js'
import { paymentStatusLabel } from '../../utils/paymentDisplay.js'
import {
  ADMIN_ORDERS_PAGE_SIZE,
  ADMIN_ORDER_FILTERS,
  createOrderActionLock,
  filterAdminOrders,
  paginateAdminOrders,
} from '../../utils/adminOrders.js'

const date = (value) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
}).format(new Date(value))

function paymentMethodLabel(order) {
  if (order.demo_payment_method === 'demo_upi') return 'UPI QR'
  if (order.demo_payment_method === 'demo_card') return 'Card'
  return order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online payment'
}

function StatusBadge({ status }) {
  const pending = status === 'placed'
  const label = pending ? 'Pending' : getOrderStatusLabel(status)
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
      pending ? 'bg-amber-100 text-amber-900' : 'bg-canvas text-ink'
    }`}>
      {label}
    </span>
  )
}

export default function AdminOrders() {
  const [state, setState] = useState({ status: 'loading', orders: [], error: '', refreshError: '' })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingOrderId, setPendingOrderId] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const actionLock = useRef(createOrderActionLock())

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState((current) => ({ ...current, status: 'loading', error: '', refreshError: '' }))
    const { data, error } = await fetchAdminOrders()
    setState((current) => error
      ? quiet && current.status === 'ready'
        ? { ...current, refreshError: error }
        : { status: 'error', orders: [], error, refreshError: '' }
      : { status: 'ready', orders: data ?? [], error: '', refreshError: '' })
  }, [])

  useEffect(() => {
    void load()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    const interval = window.setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [load])

  const matchingOrders = useMemo(
    () => filterAdminOrders(state.orders, filter, search),
    [state.orders, filter, search],
  )
  const pagination = useMemo(
    () => paginateAdminOrders(matchingOrders, page),
    [matchingOrders, page],
  )

  useEffect(() => {
    if (page !== pagination.currentPage) setPage(pagination.currentPage)
  }, [page, pagination.currentPage])

  function chooseFilter(nextFilter) {
    setFilter(nextFilter)
    setPage(1)
  }

  function searchOrders(value) {
    setSearch(value)
    setPage(1)
  }

  async function confirmOrder(order) {
    if (order.status !== 'placed' || !actionLock.current.acquire()) return
    const accepted = window.confirm(
      `Confirm order ${order.reference}? This moves it to Processing. Payment status will not change.`,
    )
    if (!accepted) {
      actionLock.current.release()
      return
    }

    setPendingOrderId(order.id)
    setFeedback({ type: '', message: '' })
    try {
      const { error } = await updateAdminOrderStatus(order.id, 'processing')
      if (error) {
        setFeedback({ type: 'error', message: error })
        await load(true)
        return
      }
      setFeedback({
        type: 'success',
        message: `${order.reference} moved to Processing. Payment status was not changed.`,
      })
      await load(true)
    } finally {
      setPendingOrderId('')
      actionLock.current.release()
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow text-muted">Fulfilment</p><h2 className="mt-2 text-4xl">Orders</h2></div>
        <Button variant="outline" onClick={() => load()}>Refresh orders</Button>
      </div>
      <p className="mt-3 text-sm text-muted">
        Customer fulfilment details are visible only to authorized admins. Payment labels reflect recorded status; no real payments are processed.
      </p>

      {state.status === 'loading' && <p className="mt-6 text-sm text-muted" role="status">Loading orders…</p>}
      {state.status === 'error' && <div className="mt-6" role="alert"><p>{state.error}</p><Button className="mt-4" variant="outline" onClick={() => load()}>Try again</Button></div>}
      {state.refreshError && <p className="mt-4 text-sm text-red-800" role="alert">{state.refreshError} Showing the last loaded order list.</p>}
      {feedback.message && (
        <p className={`mt-4 rounded-xl border p-4 text-sm ${
          feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-line bg-white'
        }`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <div className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
            <label className="block text-sm font-medium" htmlFor="admin-orders-search">
              Search reference or customer
              <input
                id="admin-orders-search"
                type="search"
                value={search}
                onChange={(event) => searchOrders(event.target.value)}
                placeholder="Reference, name, email or phone"
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 font-normal"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter orders by status">
              {ADMIN_ORDER_FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={filter === option.key}
                  onClick={() => chooseFilter(option.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    filter === option.key
                      ? 'border-ink bg-lime text-ink'
                      : 'border-line bg-white text-muted hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted" aria-live="polite">
              Showing {matchingOrders.length ? pagination.start + 1 : 0}–{pagination.end} of {matchingOrders.length} matching orders
              {state.orders.length === 500 ? ' · Showing the 500 most recent records available from the admin orders service.' : ''}
            </p>
          </div>

          {matchingOrders.length ? (
            <>
              <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-line bg-canvas text-muted"><tr>
                    <th scope="col" className="p-4">Order</th><th scope="col" className="p-4">Customer</th><th scope="col" className="p-4">Date</th>
                    <th scope="col" className="p-4">Total</th><th scope="col" className="p-4">Payment</th><th scope="col" className="p-4">Status</th><th scope="col" className="p-4">Action</th>
                  </tr></thead>
                  <tbody>{pagination.items.map((order) => (
                    <tr key={order.id} className="border-b border-line last:border-0">
                      <td className="p-4"><Link className="font-semibold underline underline-offset-2" to={`/admin/orders/${order.id}`}>{order.reference}</Link></td>
                      <td className="p-4">{order.customer_name}<br /><span className="text-xs text-muted">{order.customer_email ?? 'Email unavailable'} · {order.phone}</span></td>
                      <td className="p-4">{date(order.created_at)}</td>
                      <td className="p-4">{formatPrice(order.total_inr)}</td>
                      <td className="p-4"><span>{paymentMethodLabel(order)}</span><br /><span className="text-xs text-muted">{paymentStatusLabel(order)}</span></td>
                      <td className="p-4"><StatusBadge status={order.status} /></td>
                      <td className="p-4">
                        {order.status === 'placed' && (
                          <Button
                            disabled={Boolean(pendingOrderId)}
                            onClick={() => confirmOrder(order)}
                          >
                            {pendingOrderId === order.id ? 'Confirming…' : 'Confirm Order'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              <ul className="mt-5 space-y-3 md:hidden">
                {pagination.items.map((order) => (
                  <li key={order.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link className="font-semibold underline underline-offset-2" to={`/admin/orders/${order.id}`}>{order.reference}</Link>
                        <p className="mt-1 text-sm">{order.customer_name}</p>
                        <p className="mt-1 break-all text-xs text-muted">{order.customer_email ?? 'Email unavailable'} · {order.phone}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                      <div><dt className="text-xs text-muted">Order date</dt><dd className="mt-1">{date(order.created_at)}</dd></div>
                      <div><dt className="text-xs text-muted">Total</dt><dd className="mt-1">{formatPrice(order.total_inr)}</dd></div>
                      <div><dt className="text-xs text-muted">Payment method</dt><dd className="mt-1">{paymentMethodLabel(order)}</dd></div>
                      <div><dt className="text-xs text-muted">Payment status</dt><dd className="mt-1">{paymentStatusLabel(order)}</dd></div>
                    </dl>
                    {order.status === 'placed' && (
                      <Button
                        className="mt-4 w-full"
                        disabled={Boolean(pendingOrderId)}
                        onClick={() => confirmOrder(order)}
                      >
                        {pendingOrderId === order.id ? 'Confirming…' : 'Confirm Order'}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>

              {pagination.pageCount > 1 && (
                <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Order pages">
                  <Button variant="outline" disabled={pagination.currentPage <= 1} onClick={() => setPage(pagination.currentPage - 1)}>Previous</Button>
                  <p className="text-sm text-muted">Page {pagination.currentPage} of {pagination.pageCount}</p>
                  <Button variant="outline" disabled={pagination.currentPage >= pagination.pageCount} onClick={() => setPage(pagination.currentPage + 1)}>Next</Button>
                </nav>
              )}
            </>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
              {filter === 'pending' && !search ? 'No pending orders.' : 'No orders match the selected filter and search.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
