import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../Button.jsx'
import FormMessage from '../auth/FormMessage.jsx'
import {
  reportDeliveryProblem,
  respondToDeliveryNotification,
} from '../../services/deliveryConfirmationService.js'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'time unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function DeliveryConfirmationCard({ notification, refresh, onChanged }) {
  const [saving, setSaving] = useState(false)
  const [report, setReport] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function respond(received) {
    setSaving(true)
    setError('')
    setMessage('')
    const result = await respondToDeliveryNotification(notification.id, received)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage(received
      ? 'Thank you. Your order is now marked Delivered.'
      : 'Thanks for letting us know. Your order remains Out for Delivery while the delivery is reviewed.')
    await refresh()
    await onChanged?.()
  }

  async function submitReport(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const result = await reportDeliveryProblem(notification.id, report)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage('Your delivery problem report has been recorded for the SOLEVERSE team.')
    setReport('')
    await refresh()
  }

  const answered = notification.response !== null

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-muted">Delivery confirmation · Attempt {notification.attempt}</p>
          <Link to={`/orders/${encodeURIComponent(notification.order_reference)}`} className="mt-1 inline-block font-semibold underline underline-offset-4">
            Order {notification.order_reference}
          </Link>
          <p className="mt-2 text-xs text-muted">In-site notification · {formatDate(notification.created_at)}</p>
        </div>
        {notification.response === null && (
          <span className="rounded-full bg-lime px-3 py-1 text-xs font-semibold">Pending</span>
        )}
      </div>

      {notification.response === null ? (
        <>
          <h2 className="mt-5 text-xl font-semibold">Have you received your SOLEVERSE order?</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={saving} onClick={() => respond(true)}>
              {saving ? 'Saving…' : 'Yes, I received it'}
            </Button>
            <Button disabled={saving} variant="outline" onClick={() => respond(false)}>
              {saving ? 'Saving…' : "No, I haven't received it"}
            </Button>
          </div>
        </>
      ) : notification.response ? (
        <p className="mt-4 text-sm">You confirmed receipt on {formatDate(notification.responded_at)}. The order is marked Delivered.</p>
      ) : (
        <>
          <p className="mt-4 text-sm">
            You reported that the order had not arrived on {formatDate(notification.responded_at)}. It remains Out for Delivery while the team investigates.
          </p>
          {notification.issue_report ? (
            <div className="mt-4 rounded-xl border border-line bg-white p-4 text-sm">
              <p className="font-semibold">Your delivery problem report</p>
              <p className="mt-1 whitespace-pre-wrap">{notification.issue_report}</p>
              {notification.issue_reported_at && (
                <p className="mt-2 text-xs text-muted">Recorded {formatDate(notification.issue_reported_at)}</p>
              )}
            </div>
          ) : notification.order_status === 'out_for_delivery' ? (
            <form className="mt-4 space-y-3" onSubmit={submitReport}>
              <label className="block text-sm font-semibold" htmlFor={`delivery-problem-${notification.id}`}>
                Report a delivery problem
              </label>
              <textarea
                id={`delivery-problem-${notification.id}`}
                className="min-h-24 w-full rounded-xl border border-line bg-white p-3 text-sm"
                minLength={10}
                maxLength={2000}
                required
                value={report}
                onChange={(event) => setReport(event.target.value)}
                placeholder="Tell us what went wrong (10–2,000 characters)."
              />
              <Button type="submit" disabled={saving || report.trim().length < 10}>
                {saving ? 'Saving…' : 'Send problem report'}
              </Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">No delivery problem report was submitted for this attempt.</p>
          )}
        </>
      )}

      {message && <FormMessage className="mt-4" tone="success">{message}</FormMessage>}
      {error && <FormMessage className="mt-4" tone="error">{error}</FormMessage>}
    </article>
  )
}
