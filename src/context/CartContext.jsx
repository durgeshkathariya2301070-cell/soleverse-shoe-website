import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useCatalogue } from './CatalogueContext.jsx'
import { fetchServerCart, replaceServerCart } from '../services/cartService.js'
import { addToCart, countItems, mergeCarts, removeLine, sameCart, sanitizeCart, setQuantity } from '../utils/cart.js'

// The shopping bag, shared with the whole site.
//   const { items, itemCount, addItem, changeQuantity, removeItem, clearCart, syncState, retrySync } = useCart()
//
// HOW IT SAVES YOUR BAG
//  * Always: in this browser (localStorage), so a refresh never loses it.
//  * Logged in: also in your account (Supabase), so it follows you to another device.
//    When you log in, the bag from this browser and the bag in your account are combined.
//  * Logging out empties the bag on this browser (the next person on a shared computer starts fresh);
//    your account keeps its copy.
const CartContext = createContext(null)

const STORAGE_KEY = 'soleverse-cart-v1'
const PUSH_DELAY_MS = 600

// What is saved in the browser: { owner: userId or null, items: [...] }.
function readStorage(products) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved && typeof saved === 'object') {
      return { owner: typeof saved.owner === 'string' ? saved.owner : null, items: sanitizeCart(saved.items, products) }
    }
  } catch {
    // unreadable or blocked storage: start with an empty bag
  }
  return { owner: null, items: [] }
}

function writeStorage(owner, items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, items }))
  } catch {
    // storage blocked or full: the bag still works for this visit
  }
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { products } = useCatalogue()
  const userId = user?.id ?? null

  const [initial] = useState(() => readStorage(products))
  const [items, setItems] = useState(initial.items)
  // 'local' = not logged in | 'loading' = reading your saved bag | 'saved' | 'saving' | 'error'
  const [syncState, setSyncState] = useState('local')
  const [retryTick, setRetryTick] = useState(0) // bump to read the saved bag again after a failure

  // Refs hold the newest values for code that runs later (timers, async callbacks).
  const itemsRef = useRef(initial.items)
  const ownerRef = useRef(initial.owner) // whose bag is in this browser
  const userIdRef = useRef(null)
  const serverReadyRef = useRef(false) // true once we have read the saved bag for the current user
  const timerRef = useRef(null)
  const inFlightRef = useRef(false)
  const pendingRef = useRef(false)

  // Pushes the newest bag to the account. Only one save runs at a time; if the bag changed
  // meanwhile, one more save runs afterwards. Failures keep the local bag and show 'error'.
  const push = useCallback(async () => {
    if (!userIdRef.current || !serverReadyRef.current) return
    if (inFlightRef.current) {
      pendingRef.current = true
      return
    }
    inFlightRef.current = true
    setSyncState('saving')
    const forUser = userIdRef.current
    const { error } = await replaceServerCart(itemsRef.current)
    inFlightRef.current = false
    if (userIdRef.current !== forUser) return // logged out or switched user meanwhile
    if (error) {
      console.warn('[cart] could not save the bag to your account', error)
      pendingRef.current = false
      setSyncState('error')
      return
    }
    if (pendingRef.current) {
      pendingRef.current = false
      push()
    } else {
      setSyncState('saved')
    }
  }, [])

  const schedulePush = useCallback(() => {
    if (!userIdRef.current || !serverReadyRef.current) return
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(push, PUSH_DELAY_MS)
  }, [push])

  // Every change goes through here: update the screen, the browser copy, and (if logged in) the account.
  const commit = useCallback(
    (next, { save = true } = {}) => {
      itemsRef.current = next
      setItems(next)
      writeStorage(ownerRef.current, next)
      if (save) schedulePush()
    },
    [schedulePush],
  )

  // When the login state changes: read the saved bag and combine it, or clear on logout.
  useEffect(() => {
    if (authLoading) return undefined
    let active = true
    window.clearTimeout(timerRef.current)
    pendingRef.current = false
    userIdRef.current = userId
    serverReadyRef.current = false

    if (!userId) {
      // Logged out. If a logged-in person's bag is still in this browser, remove it.
      if (ownerRef.current !== null) {
        ownerRef.current = null
        itemsRef.current = []
        setItems([])
        writeStorage(null, [])
      }
      setSyncState('local')
      return undefined
    }

    setSyncState('loading')
    ;(async () => {
      const { items: saved, error } = await fetchServerCart()
      if (!active) return
      if (error) {
        console.warn('[cart] could not read the saved bag', error)
        const local = readStorage(products)
        // Keep what is in this browser. Only a bag that belongs to this same person (or to nobody) is kept.
        if (local.owner === null || local.owner === userId) {
          itemsRef.current = local.items
          setItems(local.items)
        } else {
          itemsRef.current = []
          setItems([])
        }
        ownerRef.current = userId
        writeStorage(userId, itemsRef.current)
        setSyncState('error')
        return
      }
      // A bag left in the browser by a DIFFERENT account is never merged into this one.
      const local = readStorage(products)
      const guestItems = local.owner === null || local.owner === userId
        ? mergeCarts(itemsRef.current, local.items)
        : []
      const merged = mergeCarts(guestItems, sanitizeCart(saved, products))
      ownerRef.current = userId
      serverReadyRef.current = true
      itemsRef.current = merged
      setItems(merged)
      writeStorage(userId, merged)
      if (sameCart(merged, saved)) setSyncState('saved')
      else push()
    })()

    return () => {
      active = false
    }
  }, [userId, authLoading, push, retryTick, products])

  // Once the remote catalogue is hydrated, restore local lines for products not in the sample set.
  useEffect(() => {
    if (authLoading || userId || products.length === 0) return
    const saved = readStorage(products)
    if (saved.owner === null) {
      itemsRef.current = saved.items
      ownerRef.current = null
      setItems(saved.items)
    }
  }, [products, authLoading, userId])

  // Try again after a failure: read the saved bag again if we never managed to, otherwise just save.
  const retrySync = useCallback(() => {
    if (!userIdRef.current) return
    if (!serverReadyRef.current) setRetryTick((tick) => tick + 1)
    else push()
  }, [push])

  // Back online after an error: try again automatically.
  useEffect(() => {
    if (syncState !== 'error') return undefined
    window.addEventListener('online', retrySync)
    return () => window.removeEventListener('online', retrySync)
  }, [syncState, retrySync])

  // Another tab changed the bag: follow it (that tab does the saving).
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return
      const saved = readStorage(products)
      if (saved.owner !== ownerRef.current) return
      itemsRef.current = saved.items
      setItems(saved.items)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [products])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  // ---- what the pages can do ----
  // addItem returns { status } so the page can say 'added' or explain a limit.
  const addItem = useCallback(
    (line, quantity = 1) => {
      const result = addToCart(itemsRef.current, line, quantity)
      if (result.status === 'added') commit(result.items)
      return { status: result.status }
    },
    [commit],
  )
  const changeQuantity = useCallback((key, quantity) => commit(setQuantity(itemsRef.current, key, quantity)), [commit])
  const removeItem = useCallback((key) => commit(removeLine(itemsRef.current, key)), [commit])
  const clearCart = useCallback(() => commit([]), [commit])

  const value = useMemo(
    () => ({ items, itemCount: countItems(items), syncState, retrySync, addItem, changeQuantity, removeItem, clearCart }),
    [items, syncState, retrySync, addItem, changeQuantity, removeItem, clearCart],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside <CartProvider> (see src/main.jsx)')
  return value
}
