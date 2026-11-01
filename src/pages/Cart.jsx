import { useMemo } from 'react'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import Button from '../components/Button.jsx'
import CartLine from '../components/cart/CartLine.jsx'
import OrderSummary from '../components/cart/OrderSummary.jsx'
import SyncNotice from '../components/cart/SyncNotice.jsx'
import FormMessage from '../components/auth/FormMessage.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useCatalogue } from '../context/CatalogueContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { computeTotals, resolveLines } from '../utils/cart.js'

// The bag page: review, change quantities, remove, then go to checkout.
// Anyone can build a bag. Only logged-in customers can check out (the checkout route is protected).
export default function Cart() {
  usePageTitle('Your bag')
  const { items, changeQuantity, removeItem } = useCart()
  const { products, status } = useCatalogue()
  const { user } = useAuth()

  const lines = useMemo(() => resolveLines(items, products), [items, products])
  const totals = computeTotals(lines)
  const blocked = lines.some((line) => line.status === 'sold_out')

  if (lines.length === 0) {
    if (status === 'loading') return <div className="container-page py-24 text-center" role="status">Loading your bag…</div>
    return (
      <div className="container-page py-20 text-center md:py-28">
        <ShoppingBag size={40} strokeWidth={1.25} className="mx-auto text-ink/40" aria-hidden="true" />
        <h1 className="mt-6 text-5xl sm:text-6xl">Your bag is empty</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">Pick a pair, choose a colour and size, and add it to your bag. It will wait for you here.</p>
        <Button to="/shop" className="mt-8">
          Browse the shop <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-14">
      <p className="eyebrow text-muted">Your bag</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">
        Bag <span className="text-muted">({totals.itemCount})</span>
      </h1>

      <div className="mt-8">
        <SyncNotice />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <ul className="divide-y divide-line border-y border-line lg:col-span-7" aria-label="Items in your bag">
          {lines.map((line) => (
            <CartLine key={line.key} line={line} onQuantityChange={changeQuantity} onRemove={removeItem} />
          ))}
        </ul>

        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <OrderSummary
            subtotal={totals.subtotal}
            deliveryFee={totals.deliveryFee}
            total={totals.total}
            itemCount={totals.itemCount}
            note="Prices and stock are confirmed again at checkout. Displayed prices are sample catalogue values."
          >
            {blocked && (
              <FormMessage tone="error" className="mt-5">
                Remove the sold-out item to continue.
              </FormMessage>
            )}
            <Button to="/checkout" className="mt-6 w-full" aria-disabled={blocked || undefined} onClick={(event) => blocked && event.preventDefault()}>
              {user ? 'Go to checkout' : 'Log in to check out'} <ArrowRight size={16} aria-hidden="true" />
            </Button>
            {!user && (
              <p className="mt-3 text-xs text-muted">You can fill your bag without an account. We ask you to log in only when you check out, and your bag comes with you.</p>
            )}
          </OrderSummary>
          <Button to="/shop" variant="link" className="w-full justify-center">
            Continue shopping
          </Button>
        </div>
      </div>
    </div>
  )
}
