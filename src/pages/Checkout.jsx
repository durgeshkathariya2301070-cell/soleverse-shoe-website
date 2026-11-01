import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import Button from '../components/Button.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import OrderSummary from '../components/cart/OrderSummary.jsx'
import DemoPaymentSimulation from '../components/checkout/DemoPaymentSimulation.jsx'
import PaymentOptions from '../components/checkout/PaymentOptions.jsx'
import ShippingForm, { SHIPPING_FIELD_ORDER, shippingFieldId } from '../components/checkout/ShippingForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { PAYMENT_METHODS } from '../data/checkoutConfig.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { createDemoPaymentSession, finishDemoPaymentSession, placeOrder, quoteOrder } from '../services/orderService.js'
import { fetchProfile, saveProfile } from '../services/profileService.js'
import { friendlyProfileMessage } from '../utils/authErrors.js'
import { toRpcItems } from '../utils/cart.js'
import { clearAttemptKey, fingerprint, getAttemptKey } from '../utils/checkoutAttempt.js'
import { toShippingPayload, validateShipping } from '../utils/checkoutValidation.js'
import { clearDemoSessionAttempt, getDemoSessionAttempt, newDemoSessionKey, saveDemoSessionAttempt } from '../utils/demoPayment.js'
import { formatPrice } from '../utils/formatPrice.js'

const emptyValues = { fullName: '', phone: '', pinCode: '', state: '', city: '', street: '', landmark: '' }

// Checkout. Wrapped in <ProtectedRoute> (see App.jsx), so only logged-in customers get here.
// The prices on this page come from the DATABASE (quote_order), not from the browser's sample data.
export default function Checkout() {
  usePageTitle('Checkout')
  const { user } = useAuth()
  const { items, clearCart } = useCart()
  const navigate = useNavigate()

  const [values, setValues] = useState(() => ({ ...emptyValues, fullName: user?.user_metadata?.full_name ?? '' }))
  const [errors, setErrors] = useState({})
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id)
  const [demoPaymentOpen, setDemoPaymentOpen] = useState(false)
  const [demoPaymentStatus, setDemoPaymentStatus] = useState('ready')
  const [demoSession, setDemoSession] = useState(null)
  const [demoSessionLoading, setDemoSessionLoading] = useState(false)
  const [demoReceipt, setDemoReceipt] = useState(null)
  const [demoSessionError, setDemoSessionError] = useState('')
  const [demoProfileSaveFailed, setDemoProfileSaveFailed] = useState(false)
  const [demoAttemptMatches, setDemoAttemptMatches] = useState(true)
  const [quote, setQuote] = useState({ status: 'loading', data: null, error: null }) // 'loading' | 'ready' | 'error'
  const [reloadCount, setReloadCount] = useState(0)
  const [submitError, setSubmitError] = useState(null) // { message, kind }
  const [submitting, setSubmitting] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState('')

  // A ref (not state) so a fast double click is blocked immediately, before React re-renders.
  const submittingRef = useRef(false)
  const placedRef = useRef(false)
  const sessionStartingRef = useRef(false)
  const itemsSignature = useMemo(() => JSON.stringify(toRpcItems(items)), [items])

  useEffect(() => {
    let active = true
    setProfileLoading(true)
    setProfileLoadError('')
    fetchProfile()
      .then((profile) => {
        if (!active) return
        if (profile) {
          setValues({
            fullName: profile.full_name ?? user?.user_metadata?.full_name ?? '',
            phone: profile.phone ?? '',
            pinCode: profile.pin_code ?? '',
            state: profile.state ?? '',
            city: profile.city ?? '',
            street: profile.street ?? '',
            landmark: profile.landmark ?? '',
          })
        }
        setProfileLoading(false)
      })
      .catch((error) => {
        if (!active) return
        console.warn('[checkout] could not load the profile', error)
        setProfileLoadError(friendlyProfileMessage(error, 'load'))
        setProfileLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.id, user?.user_metadata?.full_name])

  useEffect(() => {
    if (!user?.id || profileLoading || items.length === 0) return
    const attempt = getDemoSessionAttempt()
    if (!attempt) return
    const currentFingerprint = fingerprint({
      userId: user.id,
      items: toRpcItems(items),
      shipping: toShippingPayload(values),
      paymentMethod: attempt.method,
    })
    const attemptMatches = attempt.fingerprint === currentFingerprint
    setDemoAttemptMatches(attemptMatches)
    setPaymentMethod(attempt.method)
    setDemoPaymentOpen(true)
    setDemoSessionLoading(true)
    setDemoSessionError('')
    setDemoProfileSaveFailed(false)
    createDemoPaymentSession({
      sessionKey: attempt.sessionKey,
      orderKey: attempt.orderKey,
      items,
      shipping: toShippingPayload(values),
      paymentMethod: attempt.method,
    }).then(({ data, error }) => {
      if (error) {
        setDemoSessionError(error.message)
        setDemoPaymentStatus('error')
        return
      }
      setDemoSession(data)
      setDemoPaymentStatus(data.status === 'completed' ? 'completed' : data.status)
      if (data.status === 'completed' && data.order_reference) {
        completeOrder({ reference: data.order_reference }, !attemptMatches)
      }
    }).catch((error) => {
      console.error('[checkout] could not resume payment session', error)
      setDemoSessionError('We could not restore the payment session. Please retry safely.')
      setDemoPaymentStatus('error')
    }).finally(() => setDemoSessionLoading(false))
    // The server snapshot preserves the original checkout across refreshes and cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileLoading, itemsSignature])

  // Re-ask the database for prices and stock whenever the bag changes (or after "Try again").
  useEffect(() => {
    if (items.length === 0) return undefined
    let active = true
    setQuote((current) => ({ ...current, status: 'loading', error: null }))
    quoteOrder(items).then(({ data, error }) => {
      if (!active) return
      setQuote(error ? { status: 'error', data: null, error } : { status: 'ready', data, error: null })
    })
    return () => {
      active = false
    }
    // itemsSignature stands for `items`; reloadCount is the "try again" trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature, reloadCount])

  const changeField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
  }

  const focusField = (field) => document.getElementById(shippingFieldId(field))?.focus()

  async function handleSubmit(event) {
    event.preventDefault()
    await submitOrder()
  }

  async function submitOrder(skipProfileSave = false) {
    if (submittingRef.current) return // already sending: ignore the second click
    setSubmitError(null)

    const problems = validateShipping(values)
    setErrors(problems)
    const firstProblem = SHIPPING_FIELD_ORDER.find((field) => problems[field])
    if (firstProblem) {
      focusField(firstProblem)
      return
    }
    if (quote.status !== 'ready' || !quote.data?.ok) {
      setSubmitError({ kind: 'stock', message: 'Please review the items in your order first: something is unavailable or could not be checked.' })
      return
    }

    if (paymentMethod !== 'cod') {
      setDemoPaymentStatus('ready')
      setDemoSessionError('')
      setDemoPaymentOpen(true)
      createDemoSession()
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    const result = await createPersistedOrder(skipProfileSave)
    if (result.error) {
      submittingRef.current = false
      setSubmitting(false)
      setSubmitError(result.error)
      if (result.error.field) {
        setErrors({ [result.error.field]: result.error.message })
        focusField(result.error.field)
      }
      if (result.error.kind === 'stock') setReloadCount((count) => count + 1)
      return
    }
    completeOrder(result.data)
  }

  async function createPersistedOrder(skipProfileSave = false) {
    const shipping = toShippingPayload(values)
    if (!skipProfileSave) {
      try {
        await saveProfile({
          fullName: shipping.full_name,
          phone: shipping.phone,
          pinCode: shipping.pin_code,
          state: shipping.state,
          city: shipping.city,
          street: shipping.street,
          landmark: shipping.landmark,
        })
        setProfileLoadError('')
      } catch (error) {
        console.warn('[checkout] could not save the profile', error)
        return { data: null, error: { kind: 'profile', message: friendlyProfileMessage(error, 'save') } }
      }
    }

    const idempotencyKey = getAttemptKey(fingerprint({ userId: user.id, items: toRpcItems(items), shipping, paymentMethod }))
    return placeOrder({ idempotencyKey, items, shipping, paymentMethod: 'cod' })
  }

  function completeOrder(data, preserveCart = false) {
    // Success. Keep the cart only when it no longer matches the original resumed checkout.
    placedRef.current = true
    clearAttemptKey()
    clearDemoSessionAttempt()
    navigate(`/order-confirmation/${data.reference}`, { replace: true })
    if (!preserveCart) clearCart()
  }

  async function createDemoSession(skipProfileSave = false, forceNew = false) {
    if (sessionStartingRef.current) return
    sessionStartingRef.current = true
    setDemoSessionLoading(true)
    setDemoSessionError('')
    setDemoReceipt(null)
    setDemoPaymentStatus('ready')
    setDemoAttemptMatches(true)

    const shipping = toShippingPayload(values)
    if (!skipProfileSave) {
      try {
        await saveProfile({
          fullName: shipping.full_name,
          phone: shipping.phone,
          pinCode: shipping.pin_code,
          state: shipping.state,
          city: shipping.city,
          street: shipping.street,
          landmark: shipping.landmark,
        })
        setProfileLoadError('')
        setDemoProfileSaveFailed(false)
      } catch (error) {
        console.warn('[checkout] could not save the profile', error)
        setDemoSessionError(friendlyProfileMessage(error, 'save'))
        setDemoProfileSaveFailed(true)
        setDemoPaymentStatus('error')
        setDemoSessionLoading(false)
        sessionStartingRef.current = false
        return
      }
    }

    const attemptFingerprint = fingerprint({
      userId: user.id,
      items: toRpcItems(items),
      shipping,
      paymentMethod,
    })
    let attempt
    try {
      const existing = getDemoSessionAttempt()
      attempt = existing?.fingerprint === attemptFingerprint && !forceNew
        ? existing
        : {
            sessionKey: newDemoSessionKey(),
            orderKey: getAttemptKey(attemptFingerprint),
            method: paymentMethod,
            fingerprint: attemptFingerprint,
          }
      saveDemoSessionAttempt(attempt)
    } catch (error) {
      setDemoSessionError(error instanceof Error ? error.message : 'Secure session persistence is unavailable in this browser.')
      setDemoPaymentStatus('error')
      setDemoSessionLoading(false)
      sessionStartingRef.current = false
      return
    }

    try {
      const { data, error } = await createDemoPaymentSession({
        sessionKey: attempt.sessionKey,
        orderKey: attempt.orderKey,
        items,
        shipping,
        paymentMethod,
      })
      if (error) {
        setDemoSessionError(error.message)
        setDemoPaymentStatus('error')
        if (error.kind === 'stock') setReloadCount((count) => count + 1)
        return
      }
      setDemoSession(data)
      setDemoPaymentStatus(data.status === 'pending' ? 'ready' : data.status)
      if (data.status === 'completed' && data.order_reference) {
        completeOrder({ reference: data.order_reference })
      }
    } catch (error) {
      console.error('[checkout] could not create payment session', error)
      setDemoSessionError('We could not create the payment session. Retry safely; no order has been placed.')
      setDemoPaymentStatus('error')
    } finally {
      setDemoSessionLoading(false)
      sessionStartingRef.current = false
    }
  }

  async function finishDemoSession(outcome) {
    if (!demoSession || submittingRef.current) return
    submittingRef.current = true
    setDemoPaymentStatus('processing')
    setDemoSessionError('')
    try {
      const { data, error } = await finishDemoPaymentSession({
        sessionId: demoSession.id,
        result: outcome,
      })
      if (error) {
        setDemoPaymentStatus('error')
        setDemoSessionError(error.message)
        if (error.kind === 'stock') setReloadCount((count) => count + 1)
        return
      }
      setDemoSession({ ...demoSession, status: data.status })
      clearDemoSessionAttempt()
      setDemoReceipt(data.receipt)
      setDemoPaymentStatus(data.status)
      if (data.status === 'completed' && data.reference) {
        completeOrder({ reference: data.reference }, !demoAttemptMatches)
      }
    } catch (error) {
      console.error('[checkout] could not confirm payment session', error)
      setDemoPaymentStatus('error')
      setDemoSessionError('We could not confirm the result with the database. Retry the same session safely.')
    } finally {
      submittingRef.current = false
    }
  }

  async function leaveDemoPayment() {
    if (demoSession?.status === 'pending') {
      const { data, error } = await finishDemoPaymentSession({ sessionId: demoSession.id, result: 'cancel' })
      if (error) {
        setDemoSessionError(error.message)
        return
      }
      setDemoSession({ ...demoSession, status: data.status })
    }
    clearDemoSessionAttempt()
    setDemoPaymentOpen(false)
    setDemoPaymentStatus('ready')
    setDemoSessionError('')
  }

  if (placedRef.current) return null

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center md:py-28">
        <h1 className="text-5xl sm:text-6xl">Nothing to check out</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">Your bag is empty. Add a pair first, then come back here.</p>
        <Button to="/shop" className="mt-8">Browse the shop</Button>
      </div>
    )
  }

  const lines = quote.data?.lines ?? []
  const problemLines = lines.filter((line) => line.status !== 'ok')
  const canPlace = quote.status === 'ready' && quote.data?.ok && !submitting && !profileLoading

  if (demoPaymentOpen) {
    return (
      <div className="container-page py-10 md:py-14">
        <p className="eyebrow text-muted">Secure checkout · payment</p>
        <h1 className="mt-3 text-5xl sm:text-6xl">Complete payment</h1>
        <DemoPaymentSimulation
          method={paymentMethod}
          session={demoSession}
          loadingSession={demoSessionLoading}
          sessionError={demoSessionError}
          status={demoPaymentStatus}
          error={submitError}
          receipt={demoReceipt}
          attemptMatches={demoAttemptMatches}
          onCreateSession={() => createDemoSession(true, true)}
          onOutcome={finishDemoSession}
          onBack={leaveDemoPayment}
        />
        {demoProfileSaveFailed && !demoSession && (
          <div className="mx-auto mt-3 max-w-2xl">
            <Button type="button" variant="outline" disabled={demoSessionLoading} onClick={() => createDemoSession(true)}>
              Continue without saving address
            </Button>
          </div>
        )}
        <div className="mx-auto mt-6 max-w-2xl">
          <OrderSummary subtotal={quote.data?.subtotal_inr ?? 0} deliveryFee={quote.data?.delivery_fee_inr ?? 0} total={quote.data?.total_inr ?? 0} title="Order total" />
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-14">
      <Link to="/cart" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden="true" /> Back to bag
      </Link>
      <p className="eyebrow mt-6 text-muted">Secure checkout</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-7">
          {profileLoading && <p className="text-sm text-muted" role="status">Loading your saved delivery details…</p>}
          {profileLoadError && (
            <FormMessage tone="error">{profileLoadError} You can still enter your details below and continue.</FormMessage>
          )}
          <ShippingForm values={values} errors={errors} onChange={changeField} disabled={submitting || profileLoading} />
          <PaymentOptions value={paymentMethod} onChange={setPaymentMethod} disabled={submitting} />
        </div>

        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <section aria-labelledby="your-items-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 id="your-items-title" className="text-2xl">Your items</h2>
            {quote.status === 'loading' && <p className="mt-4 text-sm text-muted" role="status">Checking prices and stock…</p>}
            {quote.status === 'error' && (
              <div className="mt-4 space-y-3">
                <FormMessage tone="error">{quote.error.message}</FormMessage>
                {quote.error.kind === 'login' ? (
                  <Button to="/login" state={{ from: { pathname: '/checkout' } }} variant="dark">Log in again</Button>
                ) : (
                  <Button variant="outline" onClick={() => setReloadCount((count) => count + 1)}>Try again</Button>
                )}
              </div>
            )}
            {quote.status === 'ready' && (
              <ul className="mt-4 divide-y divide-line text-sm" aria-label="Items in this order">
                {lines.map((line) => (
                  <li key={`${line.product_id}|${line.color_id}|${line.size}`} className="flex justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{line.name ?? 'Unavailable item'}</p>
                      <p className="text-muted">{line.color_label ? `${line.color_label} · ` : ''}UK {line.size} · Qty {line.quantity}</p>
                      {line.status === 'insufficient_stock' && (
                        <p className="mt-1 font-medium text-red-700">
                          {line.stock > 0 ? `Only ${line.stock} left. Lower the quantity in your bag.` : 'Sold out. Remove it from your bag.'}
                        </p>
                      )}
                      {line.status === 'unavailable' && <p className="mt-1 font-medium text-red-700">No longer available. Remove it from your bag.</p>}
                    </div>
                    {line.status === 'ok' && <p className="shrink-0 font-semibold">{formatPrice(line.line_total_inr)}</p>}
                  </li>
                ))}
              </ul>
            )}
            {problemLines.length > 0 && (
              <Link to="/cart" className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-[6px]">Review your bag</Link>
            )}
          </section>

          <OrderSummary
            subtotal={quote.data?.subtotal_inr ?? 0}
            deliveryFee={quote.data?.delivery_fee_inr ?? 0}
            total={quote.data?.total_inr ?? 0}
            note="Prices and delivery fee are confirmed by our database when you place the order."
          >
            {submitError && (
              <FormMessage tone="error" className="mt-5">
                {submitError.message}{' '}
                {submitError.kind === 'login' && (
                  <Link to="/login" state={{ from: { pathname: '/checkout' } }} className="font-semibold underline underline-offset-4">Log in</Link>
                )}
              </FormMessage>
            )}
            {submitError?.kind === 'profile' && (
              <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => submitOrder(true)} disabled={!canPlace}>
                Place order without saving address
              </Button>
            )}
            <Button type="submit" className="mt-6 w-full" disabled={!canPlace} aria-busy={submitting || undefined}>
              <Lock size={14} aria-hidden="true" />
              {submitting
                ? 'Placing your order…'
                : paymentMethod === 'cod'
                  ? `Place order · Cash on Delivery`
                  : `Place order`}
            </Button>
            <p className="mt-3 text-xs text-muted">
              {paymentMethod === 'cod'
                ? `You pay ${quote.data ? formatPrice(quote.data.total_inr) : 'the total'} in cash on delivery.`
                : 'PAYMENT NOTICE — No real money will be charged.'}
            </p>
          </OrderSummary>
        </div>
      </form>
    </div>
  )
}
