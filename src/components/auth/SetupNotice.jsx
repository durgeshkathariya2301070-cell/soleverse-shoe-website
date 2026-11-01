import { isSupabaseConfigured, supabaseSetupProblem } from '../../lib/supabaseClient.js'
import FormMessage from './FormMessage.jsx'

// Shown above the forms when the .env settings are missing, so nobody is left wondering why submit does nothing.
export default function SetupNotice() {
  if (isSupabaseConfigured) return null
  return (
    <FormMessage tone="info" className="mb-6">
      <p className="font-semibold">Accounts are not connected yet.</p>
      <p className="mt-1 text-muted">{supabaseSetupProblem}</p>
    </FormMessage>
  )
}
