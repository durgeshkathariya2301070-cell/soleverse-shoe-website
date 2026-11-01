import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell.jsx'
import TextField, { PasswordField } from '../components/auth/TextField.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import SetupNotice from '../components/auth/SetupNotice.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'
import { verifyAdminAccess } from '../services/adminService.js'
import { getPostLoginPath } from '../utils/adminAccess.js'
import { getSafeRedirect, normalizeEmail, validateLoginForm } from '../utils/authValidation.js'

export default function Login() {
  usePageTitle('Log in')
  const { user, loading, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [postLoginStatus, setPostLoginStatus] = useState('idle')

  const cameFrom = location.state?.from // set by ProtectedRoute when it sent you here
  const redirectTo = getSafeRedirect(cameFrom, '/')

  const finishLogin = useCallback(async () => {
    setPostLoginStatus('checking')
    setFormError('')
    const access = await verifyAdminAccess()
    if (access.status === 'error') {
      setPostLoginStatus('error')
      setFormError(`You are signed in, but administrator access could not be verified. ${access.error}`)
      return
    }
    navigate(getPostLoginPath(access.status, redirectTo), { replace: true })
  }, [navigate, redirectTo])

  useEffect(() => {
    if (!loading && user && postLoginStatus === 'idle') {
      void finishLogin()
    }
  }, [finishLogin, loading, postLoginStatus, user])

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined })) // clear that field's message while typing
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setFormError('')

    const problems = validateLoginForm(values)
    setErrors(problems)
    const firstProblem = ['email', 'password'].find((field) => problems[field])
    if (firstProblem) {
      document.getElementById(`login-${firstProblem}`)?.focus()
      return
    }

    setSubmitting(true)
    setPostLoginStatus('checking')
    const { error } = await signIn({ email: normalizeEmail(values.email), password: values.password })
    setSubmitting(false)
    if (error) {
      setPostLoginStatus('idle')
      setFormError(error)
      return
    }
    await finishLogin()
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Log in" description="Use the email and password you signed up with.">
      <SetupNotice />
      {postLoginStatus === 'checking' && (
        <FormMessage tone="info" className="mb-6">
          Checking your account and administrator access…
        </FormMessage>
      )}
      {cameFrom && !formError && (
        <FormMessage tone="info" className="mb-6">
          Please log in to continue.
        </FormMessage>
      )}
      {formError && <FormMessage tone="error" className="mb-6">{formError}</FormMessage>}
      {postLoginStatus === 'error' && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={finishLogin}>Retry access check</Button>
          <Button to="/account" variant="dark">Continue to my account</Button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting || postLoginStatus === 'checking'} className="space-y-5">
        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={update('email')}
          error={errors.email}
          disabled={submitting || postLoginStatus === 'checking'}
          required
        />
        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          disabled={submitting || postLoginStatus === 'checking'}
          required
        />
        <Button type="submit" variant="dark" className="w-full" disabled={submitting || postLoginStatus === 'checking' || !isSupabaseConfigured}>
          {submitting ? 'Logging in…' : postLoginStatus === 'checking' ? 'Checking access…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        New to Soleverse?{' '}
        <Link to="/signup" className="font-semibold text-ink underline underline-offset-4 hover:decoration-2">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
