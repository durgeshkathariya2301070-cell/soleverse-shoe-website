import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Search, User, ShoppingBag, Menu, X, Bell } from 'lucide-react'
import { mainNav } from '../data/navigation.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useDeliveryNotifications } from '../context/DeliveryNotificationContext.jsx'
import { verifyAdminAccess } from '../services/adminService.js'
import { shouldShowAdminDashboard } from '../utils/adminAccess.js'
import Button from './Button.jsx'
import { cn } from '../utils/cn.js'

// Search is NOT functional yet (a later phase): its button is marked aria-disabled and titled
// "coming soon" so nobody is misled. Account links (Phase 5) and the bag (Phase 6) are real.
function PlaceholderIconButton({ icon: Icon, label, children }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label} (coming in a later phase)`}
      title={`${label} — coming in a later phase`}
      onClick={(event) => event.preventDefault()}
      className="relative inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5"
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </button>
  )
}

// The shopping bag: links to /cart and shows how many pairs are inside.
function BagLink() {
  const { itemCount } = useCart()
  return (
    <Link
      to="/cart"
      aria-label={itemCount > 0 ? `Shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : 'Shopping bag, empty'}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <ShoppingBag size={20} strokeWidth={1.75} aria-hidden="true" />
      {itemCount > 0 && (
        <span
          data-testid="bag-count"
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[0.625rem] font-bold text-ink ring-1 ring-ink/20"
        >
          {itemCount}
        </span>
      )}
    </Link>
  )
}

// Log in (when logged out) or My account (when logged in). Hidden on phones: the mobile menu has these links.
function AccountLink() {
  const { user, loading } = useAuth()
  // While we check for a saved login, keep an empty space so the icons do not jump around.
  if (loading) return <span aria-hidden="true" className="hidden h-10 w-10 sm:block" />

  const label = user ? 'My account' : 'Log in'
  return (
    <Link
      to={user ? '/account' : '/login'}
      aria-label={label}
      title={label}
      className="hidden h-10 items-center gap-2 rounded-full px-2.5 text-ink/80 transition-colors hover:bg-ink/5 sm:inline-flex"
    >
      <User size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className="hidden text-[0.8125rem] font-semibold uppercase tracking-[0.12em] lg:inline">{label}</span>
    </Link>
  )
}

function desktopLinkClass({ isActive }) {
  return cn(
    'relative py-2 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] transition-colors',
    // The lime underline marks the page you are on.
    'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-ink after:transition-transform after:duration-300',
    isActive ? 'text-ink after:scale-x-100' : 'text-muted hover:text-ink after:scale-x-0 hover:after:scale-x-100',
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()
  const { itemCount } = useCart()
  const { pendingCount } = useDeliveryNotifications()
  const [adminAccess, setAdminAccess] = useState({ userId: null, status: 'checking' })

  useEffect(() => {
    let active = true
    let checking = false

    if (loading) return () => { active = false }
    if (!user) {
      setAdminAccess({ userId: null, status: 'denied' })
      return () => { active = false }
    }

    setAdminAccess({ userId: user.id, status: 'checking' })
    const checkAdmin = async () => {
      if (checking) return
      checking = true
      const result = await verifyAdminAccess()
      if (active) setAdminAccess({ userId: user.id, status: result.status })
      checking = false
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkAdmin()
    }

    void checkAdmin()
    const intervalId = window.setInterval(checkAdmin, 30_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [loading, user?.id])

  const showAdminDashboard = shouldShowAdminDashboard(user, loading, adminAccess)

  async function handleMobileLogout() {
    const { error } = await signOut()
    setMenuOpen(false)
    if (!error) navigate('/', { replace: true })
  }

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Escape closes the menu; also lock page scrolling while it is open.
  useEffect(() => {
    if (!menuOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        {/* Logo */}
        <Link
          to="/"
          aria-label="SOLEVERSE home"
          className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight sm:text-2xl"
          style={{ fontStretch: '85%' }}
        >
          <span aria-hidden="true" className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-lime ring-1 ring-ink" />
          Soleverse
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {mainNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={desktopLinkClass}>
              {item.label}
            </NavLink>
          ))}
          {showAdminDashboard && (
            <NavLink to="/admin" end className={desktopLinkClass}>Admin Dashboard</NavLink>
          )}
        </nav>

        {/* Right-hand icons */}
        <div className="flex items-center gap-1">
          <PlaceholderIconButton icon={Search} label="Search" />
          {!loading && user && (
            <Link
              to="/orders#delivery-confirmations"
              aria-label={pendingCount ? `${pendingCount} pending delivery ${pendingCount === 1 ? 'confirmation' : 'confirmations'}` : 'Delivery notifications'}
              title="Delivery notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
              {pendingCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[0.625rem] font-bold text-ink ring-1 ring-ink/20">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          <AccountLink />
          <BagLink />

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5 md:hidden"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-full h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-canvas md:hidden"
      >
        <nav aria-label="Mobile" className="container-page flex flex-col py-6">
          {mainNav.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-baseline justify-between border-b border-line py-5 font-display text-4xl font-extrabold uppercase tracking-tight',
                  isActive ? 'text-ink' : 'text-ink/50',
                )
              }
              style={{ fontStretch: '85%' }}
            >
              {item.label}
              <span className="eyebrow text-muted">0{index + 1}</span>
            </NavLink>
          ))}

          {/* Account actions (the desktop icon is hidden on phones) */}
          {!loading && (
            <div className="mt-8 flex flex-col gap-3" role="group" aria-label="Account">
              {user ? (
                <>
                  <p className="eyebrow break-all text-muted">Signed in as {user.email}</p>
                  <Button to="/account" variant="dark">My account</Button>
                  {showAdminDashboard && <Button to="/admin" variant="outline">Admin Dashboard</Button>}
                  <Button variant="outline" onClick={handleMobileLogout}>Log out</Button>
                </>
              ) : (
                <>
                  <Button to="/login" variant="dark">Log in</Button>
                  <Button to="/signup" variant="outline">Create account</Button>
                </>
              )}
            </div>
          )}
          <Link to="/cart" className="eyebrow mt-8 block text-ink underline underline-offset-4">Shopping bag{itemCount > 0 ? ` (${itemCount})` : ''}</Link>
          {user && (
            <Link to="/orders#delivery-confirmations" className="eyebrow mt-4 block text-ink underline underline-offset-4">
              Delivery notifications{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
            </Link>
          )}
          <p className="eyebrow mt-4 text-muted">Search is coming in a later phase.</p>
        </nav>
      </div>
    </header>
  )
}
