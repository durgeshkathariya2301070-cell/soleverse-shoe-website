import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, LogOut } from 'lucide-react'
import TextField from '../components/auth/TextField.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { INDIAN_STATES } from '../data/indianStates.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { fetchProfile, saveProfile } from '../services/profileService.js'
import { friendlyProfileMessage } from '../utils/authErrors.js'
import { normalizeFullName, validateFullName, NAME_MAX_LENGTH } from '../utils/authValidation.js'
import { LIMITS, validateShipping, toShippingPayload } from '../utils/checkoutValidation.js'
import { normalizeProfilePhone, validateProfilePhone } from '../utils/profileValidation.js'

// "2026-10-11T08:00:00Z" -> "11 October 2026"
function formatDate(isoString) {
  const date = new Date(isoString)
  if (!isoString || Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

const emptyAddress = { pinCode: '', state: '', city: '', street: '', landmark: '' }

// This page is wrapped in <ProtectedRoute> (see App.jsx), so `user` is always set here.
export default function Account() {
  usePageTitle('My account')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null) // the row from the profiles table (null = none yet)
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('')
  const [reloadCount, setReloadCount] = useState(0) // bump to try loading again
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [address, setAddress] = useState(emptyAddress)
  const [addressErrors, setAddressErrors] = useState({})
  const [save, setSave] = useState({ status: 'idle', message: '' }) // 'idle' | 'saving' | 'saved' | 'error'
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const userId = user.id
  const nameFromSignup = user.user_metadata?.full_name ?? ''

  // Load the profile when the page opens (and again if you press "Try again").
  useEffect(() => {
    let active = true
    setLoadState('loading')
    fetchProfile()
      .then((row) => {
        if (!active) return
        setProfile(row)
        setName(row?.full_name ?? nameFromSignup)
        setPhone(row?.phone ?? '')
        setAddress({
          pinCode: row?.pin_code ?? '',
          state: row?.state ?? '',
          city: row?.city ?? '',
          street: row?.street ?? '',
          landmark: row?.landmark ?? '',
        })
        setLoadState('ready')
      })
      .catch((error) => {
        if (!active) return
        console.warn('[account] could not load the profile', error)
        setLoadError(friendlyProfileMessage(error, 'load'))
        setName(nameFromSignup)
        setPhone('')
        setAddress(emptyAddress)
        setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [userId, nameFromSignup, reloadCount])

  const savedName = profile?.full_name ?? nameFromSignup
  const savedAddress = [
    profile?.street,
    [profile?.city, profile?.state, profile?.pin_code].filter(Boolean).join(', '),
    profile?.landmark,
  ].filter(Boolean).join(' · ')
  const memberSince = formatDate(user.created_at)

  async function handleSave(event) {
    event.preventDefault()
    if (save.status === 'saving') return

    const problem = validateFullName(name)
    const phoneProblem = validateProfilePhone(phone)
    const hasAddress = Object.values(address).some((value) => String(value).trim())
    const addressProblems = hasAddress
      ? validateShipping({ ...address, fullName: name, phone })
      : {}
    setNameError(problem)
    setPhoneError(phoneProblem || addressProblems.phone || '')
    const nextAddressErrors = Object.fromEntries(
      Object.entries(addressProblems).filter(([field]) => !['fullName', 'phone'].includes(field)),
    )
    setAddressErrors(nextAddressErrors)
    if (problem || phoneProblem || Object.keys(addressProblems).length > 0) {
      if (problem) {
        document.getElementById('account-name')?.focus()
      } else if (phoneProblem || addressProblems.phone) {
        document.getElementById('account-phone')?.focus()
      } else {
        document.getElementById(`account-${Object.keys(nextAddressErrors)[0].replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`)?.focus()
      }
      return
    }

    const cleanName = normalizeFullName(name)
    const cleanPhone = normalizeProfilePhone(phone)
    const cleanAddress = hasAddress
      ? (() => {
          const shipping = toShippingPayload({ ...address, fullName: cleanName, phone: cleanPhone })
          return {
            pinCode: shipping.pin_code,
            state: shipping.state,
            city: shipping.city,
            street: shipping.street,
            landmark: shipping.landmark,
          }
        })()
      : emptyAddress
    setName(cleanName)
    setPhone(cleanPhone)
    setAddress(cleanAddress)
    const profileAddress = {
      pinCode: profile?.pin_code ?? '',
      state: profile?.state ?? '',
      city: profile?.city ?? '',
      street: profile?.street ?? '',
      landmark: profile?.landmark ?? '',
    }
    if (
      loadState === 'ready'
      && cleanName === (profile?.full_name ?? '')
      && cleanPhone === (profile?.phone ?? '')
      && JSON.stringify(cleanAddress) === JSON.stringify(profileAddress)
    ) {
      setSave({ status: 'saved', message: 'Your profile details are already up to date.' })
      return
    }

    setSave({ status: 'saving', message: '' })
    try {
      const row = await saveProfile({ fullName: cleanName, phone: cleanPhone, ...cleanAddress })
      setProfile(row)
      setAddress({
        pinCode: row.pin_code ?? '',
        state: row.state ?? '',
        city: row.city ?? '',
        street: row.street ?? '',
        landmark: row.landmark ?? '',
      })
      setLoadState('ready')
      setSave({ status: 'saved', message: 'Profile details saved.' })
    } catch (error) {
      console.warn('[account] could not save the profile', error)
      setSave({ status: 'error', message: friendlyProfileMessage(error, 'save') })
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    const { error } = await signOut()
    if (error) {
      setLogoutError(error)
      setLoggingOut(false)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="container-page py-12 md:py-20">
      <p className="eyebrow mb-4 text-muted">My account</p>
      <h1 className="text-5xl sm:text-6xl lg:text-7xl">{savedName ? `Hi, ${savedName.split(' ')[0]}.` : 'Welcome.'}</h1>

      <div className="mt-10 grid gap-6 lg:grid-cols-[5fr_6fr]">
        {/* Details */}
        <section aria-labelledby="details-heading" className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-lime font-display text-2xl font-black uppercase ring-1 ring-ink/20">
              {(savedName || user.email || '?').trim().charAt(0)}
            </span>
            <h2 id="details-heading" className="text-2xl">Your details</h2>
          </div>
          <dl className="mt-8 space-y-5 text-sm">
            <div>
              <dt className="eyebrow text-muted">Full name</dt>
              <dd className="mt-1 text-base">{savedName || <span className="text-muted">Not added yet</span>}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Email</dt>
              <dd className="mt-1 break-all text-base">{user.email}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Phone</dt>
              <dd className="mt-1 text-base">{profile?.phone || <span className="text-muted">Not added yet</span>}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Delivery address</dt>
              <dd className="mt-1 text-base">{savedAddress || <span className="text-muted">Not added yet</span>}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Member since</dt>
              <dd className="mt-1 text-base">{memberSince ?? <span className="text-muted">Not available</span>}</dd>
            </div>
          </dl>
        </section>

        {/* Edit profile details + log out */}
        <section aria-labelledby="edit-heading" className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h2 id="edit-heading" className="text-2xl">Personal Details &amp; Delivery Address</h2>

          {loadState === 'loading' && <p className="mt-6 text-sm text-muted" role="status">Loading your profile…</p>}

          {loadState === 'error' && (
            <FormMessage tone="error" className="mt-6">
              <p>{loadError}</p>
              <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="mt-2 font-semibold underline underline-offset-4">
                Try again
              </button>
            </FormMessage>
          )}

          <form onSubmit={handleSave} noValidate aria-busy={save.status === 'saving'} className="mt-6 space-y-5">
            <TextField
              id="account-name"
              label="Full name"
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH + 20}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
                if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
              }}
              error={nameError}
              disabled={loadState === 'loading' || save.status === 'saving'}
              required
            />
            <TextField
              id="account-phone"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              hint="Optional. Include your country code for international numbers."
              maxLength={30}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setPhoneError('')
                if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
              }}
              error={phoneError}
              disabled={loadState === 'loading' || save.status === 'saving'}
            />
            <div className="border-t border-line pt-5">
              <h3 className="text-lg font-semibold">Delivery Address</h3>
              <p className="mt-1 text-sm text-muted">Optional to save here. Checkout will ask for any missing required delivery details.</p>
            </div>
            <TextField
              id="account-pin-code"
              label="PIN code"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={address.pinCode}
              onChange={(event) => {
                setAddress((current) => ({ ...current, pinCode: event.target.value }))
                setAddressErrors((current) => ({ ...current, pinCode: undefined }))
                if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
              }}
              error={addressErrors.pinCode}
              disabled={loadState === 'loading' || save.status === 'saving'}
            />
            <div>
              <label htmlFor="account-state" className="eyebrow mb-2 block text-ink">State</label>
              <select
                id="account-state"
                value={address.state}
                autoComplete="address-level1"
                aria-invalid={addressErrors.state ? 'true' : undefined}
                aria-describedby={addressErrors.state ? 'account-state-error' : undefined}
                onChange={(event) => {
                  setAddress((current) => ({ ...current, state: event.target.value }))
                  setAddressErrors((current) => ({ ...current, state: undefined }))
                  if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
                }}
                disabled={loadState === 'loading' || save.status === 'saving'}
                className={`h-12 w-full rounded-xl border bg-surface px-4 text-base text-ink disabled:cursor-not-allowed disabled:opacity-60 ${addressErrors.state ? 'border-red-600' : 'border-line hover:border-ink/40 focus:border-ink'}`}
              >
                <option value="">Choose a state</option>
                {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              {addressErrors.state && <p id="account-state-error" className="mt-2 text-sm font-medium text-red-700">{addressErrors.state}</p>}
            </div>
            <TextField
              id="account-city"
              label="City / town"
              autoComplete="address-level2"
              maxLength={LIMITS.city[1] + 20}
              value={address.city}
              onChange={(event) => {
                setAddress((current) => ({ ...current, city: event.target.value }))
                setAddressErrors((current) => ({ ...current, city: undefined }))
                if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
              }}
              error={addressErrors.city}
              disabled={loadState === 'loading' || save.status === 'saving'}
            />
            <TextField
              id="account-street"
              label="Street address"
              autoComplete="street-address"
              maxLength={LIMITS.street[1] + 20}
              value={address.street}
              onChange={(event) => {
                setAddress((current) => ({ ...current, street: event.target.value }))
                setAddressErrors((current) => ({ ...current, street: undefined }))
                if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
              }}
              error={addressErrors.street}
              disabled={loadState === 'loading' || save.status === 'saving'}
            />
            <TextField
              id="account-landmark"
              label="Landmark (optional)"
              maxLength={LIMITS.landmarkMax + 20}
              value={address.landmark}
              onChange={(event) => {
                setAddress((current) => ({ ...current, landmark: event.target.value }))
                setAddressErrors((current) => ({ ...current, landmark: undefined }))
                if (save.status !== 'saving') setSave({ status: 'idle', message: '' })
              }}
              error={addressErrors.landmark}
              disabled={loadState === 'loading' || save.status === 'saving'}
            />
            <Button type="submit" variant="dark" disabled={loadState !== 'ready' || save.status === 'saving'}>
              {save.status === 'saving' ? 'Saving…' : 'Save changes'}
            </Button>
          </form>

          {save.status === 'saved' && <FormMessage tone="success" className="mt-5">{save.message}</FormMessage>}
          {save.status === 'error' && <FormMessage tone="error" className="mt-5">{save.message}</FormMessage>}

          <hr className="my-8 border-line" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xs text-sm text-muted">Log out of this browser. Your account stays safe.</p>
            <Button variant="outline" onClick={handleLogout} disabled={loggingOut}>
              <LogOut size={16} aria-hidden="true" />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </Button>
          </div>
          {logoutError && <FormMessage tone="error" className="mt-5">{logoutError}</FormMessage>}
        </section>
      </div>

      <section aria-labelledby="orders-heading" className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow text-muted">Your purchases</p>
            <h2 id="orders-heading" className="mt-2 text-2xl">My Orders</h2>
            <p className="mt-2 text-sm text-muted">Review past purchases and follow each order’s current status.</p>
          </div>
          <Button to="/orders" variant="outline">
            <ClipboardList size={16} aria-hidden="true" />
            View my orders
          </Button>
        </div>
      </section>

    </div>
  )
}
