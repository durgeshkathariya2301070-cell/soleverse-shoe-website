import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, CreditCard, LoaderCircle, Smartphone } from 'lucide-react'
import Button from '../Button.jsx'
import FormMessage from '../auth/FormMessage.jsx'
import { SIMULATED_PAYMENT_NOTICE, demoCardOutcome, formatDemoCardNumber, formatDemoCountdown, makeDemoQrPayload, remainingDemoSessionMs, runDemoPaymentSimulation, validateDemoCard, detectDemoCardNetwork } from '../../utils/demoPayment.js'
import { formatPrice } from '../../utils/formatPrice.js'

const methodIcons = { demo_upi: Smartphone, demo_card: CreditCard }
const methodLabels = { demo_upi: 'UPI QR', demo_card: 'Credit/Debit Card' }
const initialCard = { number: '', name: '', expiry: '', cvv: '' }
const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm'

export default function DemoPaymentSimulation({
  method,
  session,
  loadingSession,
  sessionError,
  attemptMatches,
  status,
  error,
  receipt,
  onCreateSession,
  onOutcome,
  onBack,
}) {
  const [busyOutcome, setBusyOutcome] = useState('')
  const [pendingOutcome, setPendingOutcome] = useState('')
  const [card, setCard] = useState(initialCard)
  const [cardErrors, setCardErrors] = useState({})
  const [qr, setQr] = useState({ status: 'loading', image: '', error: '' })
  const [now, setNow] = useState(Date.now())
  const Icon = methodIcons[method]
  const remainingMs = session ? remainingDemoSessionMs(session, now) : 0
  const expired = Boolean(session && remainingMs === 0 && session.status === 'pending')
  const processing = status === 'processing'
  const resultFailed = status === 'failed' || session?.status === 'failed'
  const resultExpired = status === 'expired' || session?.status === 'expired' || expired
  const payload = useMemo(() => session ? makeDemoQrPayload(session) : '', [session])

  useEffect(() => {
    if (!session || session.status !== 'pending') return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [session])

  useEffect(() => {
    let active = true
    if (method !== 'demo_upi' || !session) {
      setQr({ status: 'loading', image: '', error: '' })
      return () => { active = false }
    }
    setQr({ status: 'loading', image: '', error: '' })
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
      color: { dark: '#151515', light: '#ffffff' },
    })).then((image) => {
      if (active) setQr({ status: 'ready', image, error: '' })
    }).catch(() => {
      if (active) setQr({ status: 'error', image: '', error: 'The QR could not be generated. Try creating a new session.' })
    })
    return () => { active = false }
  }, [method, payload, session])

  function setCardField(field, value) {
    setCard((current) => ({ ...current, [field]: value }))
    setCardErrors((current) => ({ ...current, [field]: '' }))
  }

  async function simulate(outcome) {
    if (busyOutcome || processing || expired || !session) return
    setBusyOutcome(outcome)
    setPendingOutcome(outcome)
    await runDemoPaymentSimulation(outcome, onOutcome, () => new Promise((resolve) => window.setTimeout(resolve, 900)))
    setBusyOutcome('')
  }

  async function submitCard(event) {
    event.preventDefault()
    const errors = validateDemoCard(card)
    setCardErrors(errors)
    if (Object.keys(errors).length) return
    const outcome = demoCardOutcome(card.number)
    setCard(initialCard)
    setCardErrors({})
    await simulate(outcome)
  }

  const transactionAt = receipt?.transaction_at
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.transaction_at))
    : ''

  return (
    <section aria-labelledby="payment-details-title" className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="bg-ink p-6 text-white sm:p-8">
        <button type="button" onClick={onBack} disabled={processing} className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white disabled:opacity-50">
          <ArrowLeft size={16} aria-hidden="true" /> Back to checkout
        </button>
        <div className="mt-8 flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-lime text-ink">
            {Icon && <Icon size={24} aria-hidden="true" />}
          </span>
          <div>
            <p className="eyebrow text-white/65">{methodLabels[method]}</p>
            <h2 id="payment-details-title" className="mt-1 text-3xl">Payment details</h2>
          </div>
        </div>
        <p className="mt-6 text-4xl font-semibold">{formatPrice(session?.amount_inr ?? 0)}</p>
        {session && <p className="mt-2 text-sm text-white/75">Order reference: {session.order_reference}</p>}
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <p role="note" className="rounded-xl border border-dashed border-ink/30 bg-lime/30 px-4 py-3 text-sm font-bold">
          {SIMULATED_PAYMENT_NOTICE}
        </p>
        <p className="text-sm text-muted">
          Not a bank-confirmed payment. No financial service is contacted, and no card numbers,
          CVVs, UPI PINs, or banking passwords are sent to the server.
        </p>
        {attemptMatches === false && (
          <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
            This session is tied to the checkout saved before refresh. Its original delivery details and items are locked on the server.
            Completing it will leave your current bag unchanged.
          </p>
        )}

        {loadingSession && (
          <div className="flex items-center gap-3 rounded-xl bg-canvas p-4 text-sm" role="status">
            <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Creating secure payment session…
          </div>
        )}
        {sessionError && <FormMessage tone="error">{sessionError}</FormMessage>}
        {sessionError && !loadingSession && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (session?.status === 'pending') onOutcome(pendingOutcome || 'success')
              else {
                setPendingOutcome('')
                onCreateSession()
              }
            }}
          >
            {session?.status === 'pending' ? 'Retry confirmation safely' : 'Retry payment session'}
          </Button>
        )}

        {session && session.status === 'pending' && (
          <>
            <div className="rounded-xl border border-line bg-canvas p-4 text-sm">
              <p><span className="text-muted">Payment session</span> <strong className="ml-2">{session.session_reference}</strong></p>
              <p className="mt-1"><span className="text-muted">Session expires in</span> <strong className="ml-2 tabular-nums">{formatDemoCountdown(remainingMs)}</strong></p>
            </div>
            {method === 'demo_upi' ? (
              <div className="grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
                <div className="mx-auto grid min-h-[260px] w-full max-w-[260px] place-items-center rounded-xl border border-line bg-white p-2">
                  {qr.status === 'loading' && <p className="text-sm text-muted" role="status">Generating QR…</p>}
                  {qr.status === 'error' && <p className="p-4 text-center text-sm text-red-800" role="alert">{qr.error}</p>}
                  {qr.status === 'ready' && <img src={qr.image} alt="SOLEVERSE payment-session QR code. Scanning does not initiate a UPI payment." className="h-60 w-60" />}
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-semibold">Mock QR payload — not a UPI payment request</p>
                  <p className="break-all font-mono text-xs text-muted">{payload}</p>
                  <p>Scanning this QR cannot transfer money. Confirm only with the controls below.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submitCard} className="space-y-4 rounded-xl border border-line bg-canvas p-4 sm:p-6">
                <div className="flex items-center justify-between rounded-xl bg-ink p-5 text-white">
                  <div><p className="eyebrow text-white/65">Test card</p><p className="mt-2 font-mono tracking-widest">{card.number ? formatDemoCardNumber(card.number) : '•••• •••• •••• ••••'}</p><p className="mt-2 text-sm">{card.name || 'Cardholder name'}</p></div>
                  <span className="text-right text-xs">{detectDemoCardNetwork(card.number)}<br />{card.expiry || 'MM/YY'}</span>
                </div>
                <p className="rounded-lg border border-line bg-white p-3 text-xs text-muted">
                  Test-only inputs: success <code>4242 4242 4242 4242</code>; failure <code>4000 0000 0000 0002</code>.
                  Never enter real card details. These values are validated only in this browser.
                </p>
                <label className="block text-sm font-medium">Test card number
                  <input className={`${inputClass} mt-1`} inputMode="numeric" autoComplete="off" maxLength={19} value={formatDemoCardNumber(card.number)} onChange={(event) => setCardField('number', event.target.value.replace(/\D/g, '').slice(0, 16))} aria-invalid={Boolean(cardErrors.number)} aria-describedby={cardErrors.number ? 'demo-card-number-error' : undefined} />
                  {cardErrors.number && <small id="demo-card-number-error" className="mt-1 block text-red-700">{cardErrors.number}</small>}
                </label>
                <label className="block text-sm font-medium">Cardholder name
                  <input id="demo-card-name" className={`${inputClass} mt-1`} autoComplete="off" value={card.name} onChange={(event) => setCardField('name', event.target.value)} aria-invalid={Boolean(cardErrors.name)} aria-describedby={cardErrors.name ? 'demo-card-name-error' : undefined} />
                  {cardErrors.name && <small id="demo-card-name-error" className="mt-1 block text-red-700">{cardErrors.name}</small>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium">Expiry (MM/YY)
                    <input id="demo-card-expiry" className={`${inputClass} mt-1`} inputMode="numeric" autoComplete="off" maxLength={5} placeholder="MM/YY" value={card.expiry} onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
                      setCardField('expiry', digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits)
                    }} aria-invalid={Boolean(cardErrors.expiry)} aria-describedby={cardErrors.expiry ? 'demo-card-expiry-error' : undefined} />
                    {cardErrors.expiry && <small id="demo-card-expiry-error" className="mt-1 block text-red-700">{cardErrors.expiry}</small>}
                  </label>
                  <label className="block text-sm font-medium">Test security code
                    <input id="demo-card-cvv" className={`${inputClass} mt-1`} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={card.cvv} onChange={(event) => setCardField('cvv', event.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={Boolean(cardErrors.cvv)} aria-describedby={cardErrors.cvv ? 'demo-card-cvv-error' : undefined} />
                    {cardErrors.cvv && <small id="demo-card-cvv-error" className="mt-1 block text-red-700">{cardErrors.cvv}</small>}
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={processing || expired}>Confirm payment</Button>
              </form>
            )}

            {processing && (
              <div className="flex items-center gap-3 rounded-xl bg-canvas p-4 text-sm" role="status">
                <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Processing payment result…
              </div>
            )}
            {method === 'demo_upi' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="dark" disabled={processing || expired || qr.status !== 'ready'} onClick={() => simulate('success')}>
                  {busyOutcome === 'success' ? 'Processing…' : 'Confirm mock payment'}
                </Button>
                <Button type="button" variant="outline" disabled={processing || expired} onClick={() => simulate('failure')}>
                  {busyOutcome === 'failure' ? 'Processing…' : 'Simulate payment failure'}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted">A QR scan or countdown never marks an order paid. Only the server-validated mock confirmation can complete this session.</p>
          </>
        )}

        {resultFailed && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p><strong>Payment could not be completed.</strong> No order was placed, no payment was recorded, and inventory was unchanged. This session cannot be reused.</p>
            </div>
            {receipt && <DemoReceipt receipt={receipt} transactionAt={transactionAt} />}
            <Button type="button" onClick={onCreateSession}>Create a new payment session</Button>
          </div>
        )}
        {resultExpired && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm" role="alert">
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p><strong>{method === 'demo_upi' ? 'QR expired.' : 'Payment session expired.'}</strong> This session can no longer be confirmed. Create a new session to continue.</p>
            </div>
            {receipt && <DemoReceipt receipt={receipt} transactionAt={transactionAt} />}
            <Button type="button" onClick={onCreateSession}>Create a new session</Button>
          </div>
        )}
        {status === 'error' && error && <FormMessage tone="error">{error.message}</FormMessage>}
        {status === 'completed' && receipt && <DemoReceipt receipt={receipt} transactionAt={transactionAt} />}
        {session?.status === 'cancelled' && <FormMessage tone="info">This payment session was cancelled and cannot be reused. Create a new session to continue.</FormMessage>}
      </div>
    </section>
  )
}

function DemoReceipt({ receipt, transactionAt }) {
  return (
    <section aria-label="Transaction details" className="rounded-xl border border-line bg-canvas p-4 text-sm">
      <h3 className="text-xl font-semibold">Payment details</h3>
      <p className="mt-2 font-semibold">Not a bank-confirmed payment.</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted">Order reference</dt><dd>{receipt.order_reference || 'Not created'}</dd>
        <dt className="text-muted">Session reference</dt><dd>{receipt.session_reference}</dd>
        <dt className="text-muted">Transaction reference</dt><dd className="break-all">{receipt.transaction_reference}</dd>
        <dt className="text-muted">Amount</dt><dd>{formatPrice(receipt.amount_inr)}</dd>
        <dt className="text-muted">Method</dt><dd>{methodLabels[receipt.demo_method]}</dd>
        <dt className="text-muted">Result</dt><dd className="capitalize">{receipt.status}</dd>
        {transactionAt && <><dt className="text-muted">Timestamp</dt><dd>{transactionAt}</dd></>}
      </dl>
    </section>
  )
}
