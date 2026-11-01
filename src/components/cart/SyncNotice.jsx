import { useCart } from '../../context/CartContext.jsx'
import FormMessage from '../auth/FormMessage.jsx'

// Tells a logged-in shopper when their bag could not be saved to their account.
// The bag itself is safe in this browser; this only explains why it may not appear on another device.
export default function SyncNotice() {
  const { syncState, retrySync } = useCart()
  if (syncState !== 'error') return null
  return (
    <FormMessage tone="info" className="mb-6">
      We couldn&apos;t save your bag to your account just now. It is still saved in this browser.{' '}
      <button type="button" onClick={retrySync} className="font-semibold underline underline-offset-4">
        Try again
      </button>
      . If this keeps happening, make sure the Phase 6 SQL files have been run in Supabase.
    </FormMessage>
  )
}
