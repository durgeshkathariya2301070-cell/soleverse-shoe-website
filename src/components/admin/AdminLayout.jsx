import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, ClipboardList, LayoutDashboard, PackageSearch, Users } from 'lucide-react'
import { cn } from '../../utils/cn.js'

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Boxes },
  { to: '/admin/inventory', label: 'Inventory', icon: PackageSearch },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/users', label: 'Users', icon: Users },
]

export default function AdminLayout() {
  return (
    <div className="container-page py-8 md:py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <p className="eyebrow text-muted">SOLEVERSE · Operations</p>
          <h1 className="mt-2 text-3xl">Admin</h1>
          <nav aria-label="Admin navigation" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold',
                  isActive ? 'border-ink bg-lime text-ink' : 'border-line bg-surface text-muted hover:text-ink',
                )}
              >
                <Icon size={16} aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 flex-1">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
