import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { friendlyAuthMessage, NOT_CONFIGURED_MESSAGE } from '../utils/authErrors.js'

// Keeps track of who is logged in and shares it with the whole site.
// Any component can call:  const { user, loading, signIn, signUp, signOut } = useAuth()
//   user     - the logged-in person, or null
//   loading  - true only while we check for a saved login when the page first opens
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  // If Supabase is not configured there is nothing to wait for.
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    let authStateChanged = false

    // Subscribe before restoring so a newer sign-in cannot be overwritten by a stale restore.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      authStateChanged = true
      if (!active) return
      setSession(newSession ?? null)
      setLoading(false)
    })

    // Restore a saved login (this is what keeps you logged in after a refresh).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !authStateChanged) setSession(data?.session ?? null)
      })
      .catch((error) => console.warn('[auth] could not restore the session', error))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  // Each action returns { error } where error is a friendly sentence, or null when it worked.
  const signUp = useCallback(async ({ fullName, email, password }) => {
    if (!supabase) return { error: NOT_CONFIGURED_MESSAGE }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }, // the database trigger copies this into the profiles table
          emailRedirectTo: `${window.location.origin}/account`,
        },
      })
      if (error) return { error: friendlyAuthMessage(error, 'signup') }

      // When email confirmation is ON, Supabase does not report "already registered" as an error
      // (that would reveal who has an account). It returns a user with no identities instead.
      if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
        return { error: friendlyAuthMessage({ code: 'user_already_exists' }, 'signup') }
      }
      // A session means we are logged in straight away. No session means "confirm your email first".
      if (data.session) {
        setSession(data.session)
        return { error: null, needsEmailConfirmation: false }
      }
      return { error: null, needsEmailConfirmation: true }
    } catch (error) {
      console.warn('[auth] sign up failed', error)
      return { error: friendlyAuthMessage(error, 'signup') }
    }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) return { error: NOT_CONFIGURED_MESSAGE }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: friendlyAuthMessage(error, 'login') }
      setSession(data.session)
      return { error: null }
    } catch (error) {
      console.warn('[auth] log in failed', error)
      return { error: friendlyAuthMessage(error, 'login') }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return { error: null }
    try {
      // "local" logs out this browser only, not your other devices.
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) return { error: "We couldn't log you out. Please try again." }
      setSession(null)
      return { error: null }
    } catch (error) {
      console.warn('[auth] log out failed', error)
      return { error: friendlyAuthMessage(error, 'login') }
    }
  }, [])

  const value = useMemo(
    () => ({ user: session?.user ?? null, loading, signUp, signIn, signOut }),
    [session, loading, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider> (see src/main.jsx)')
  return value
}
