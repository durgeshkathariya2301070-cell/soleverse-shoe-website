import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthShell from '../components/auth/AuthShell.jsx'
import TextField, { PasswordField } from '../components/auth/TextField.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import SetupNotice from '../components/auth/SetupNotice.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'
import { friendlyAuthMessage } from '../utils/authErrors.js'
import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getSafeRedirect,
  normalizeEmail,
  normalizeFullName,
  validateSignupForm,
} from '../utils/authValidation.js'

const FIELD_ORDER = ['fullName', 'email', 'password', 'confirmPassword']
const emptyForm = { fullName: '', email: '', password: '', confirmPassword: '' }

export default function Signup() {
  usePageTitle('Create account')
  const { user, loading, signUp } = useAuth()
  const location = useLocation()
  const [values, setValues] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSentTo, setConfirmationSentTo] = useState('') // set when we must wait for the email link

  if (!loading && user) return <Navigate to={getSafeRedirect(location.state?.from)} replace />

  // Supabase says "check your email": show a clear next step instead of the form.
  if (confirmationSentTo) {
    return (
      <AuthShell eyebrow="Almost there" title="Check your inbox">
        <FormMessage tone="success">
          <p className="flex items-center gap-2 font-semibold">
            <MailCheck size={18} aria-hidden="true" /> Confirmation email sent
          </p>
          <p className="mt-1">
            We sent a link to <strong className="break-all">{confirmationSentTo}</strong>. Open it to finish creating your
            account, then log in. If you can't find it, check your spam folder.
          </p>
        </FormMessage>
        <Button to="/login" variant="dark" className="mt-6 w-full">
          Go to log in
        </Button>
      </AuthShell>
    )
  }

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setFormError('')

    const problems = validateSignupForm(values)
    setErrors(problems)
    const firstProblem = FIELD_ORDER.find((field) => problems[field])
    if (firstProblem) {
      document.getElementById(`signup-${firstProblem}`)?.focus()
      return
    }

    setSubmitting(true)
    const email = normalizeEmail(values.email)
    try {
      const result = await signUp({ fullName: normalizeFullName(values.fullName), email, password: values.password })
      if (result.error) {
        setFormError(result.error)
        return
      }
      // Logged in straight away: the redirect above takes over. Otherwise ask them to confirm their email.
      if (result.needsEmailConfirmation) {
        setValues(emptyForm) // do not keep the password in memory longer than needed
        setConfirmationSentTo(email)
      }
    } catch (error) {
      setFormError(friendlyAuthMessage(error, 'signup'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell eyebrow="Join Soleverse" title="Create account" description="It takes a minute. We only need your name, email and a password.">
      <SetupNotice />
      {formError && <FormMessage tone="error" className="mb-6">{formError}</FormMessage>}

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="space-y-5">
        <TextField
          id="signup-fullName"
          label="Full name"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH + 20}
          value={values.fullName}
          onChange={update('fullName')}
          error={errors.fullName}
          disabled={submitting}
          required
        />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={update('email')}
          error={errors.email}
          disabled={submitting}
          required
        />
        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          disabled={submitting}
          required
        />
        <PasswordField
          id="signup-confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          disabled={submitting}
          required
        />
        <Button type="submit" variant="dark" className="w-full" disabled={submitting || !isSupabaseConfigured}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-ink underline underline-offset-4 hover:decoration-2">
          Log in
        </Link>
      </p>
    </AuthShell>
  )
}
