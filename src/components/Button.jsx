import { Link } from 'react-router-dom'
import { cn } from '../utils/cn.js'

// One button style for the whole site.
//   variant: 'primary' (lime), 'dark', 'outline', 'link' (text with arrow-style underline)
//   to: renders a router <Link>. Without `to` it renders a normal <button>.
const base =
  'inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.1em] text-xs transition-all duration-200 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none'

const variants = {
  primary: 'rounded-full bg-lime px-6 py-3.5 text-ink hover:bg-ink hover:text-lime',
  dark: 'rounded-full bg-ink px-6 py-3.5 text-white hover:bg-lime hover:text-ink',
  outline:
    'rounded-full border border-ink/25 px-6 py-3.5 text-ink hover:border-ink hover:bg-ink hover:text-white',
  link: 'underline decoration-1 underline-offset-[6px] hover:decoration-2',
}

export default function Button({ to, variant = 'primary', className, children, ...props }) {
  const classes = cn(base, variants[variant], className)

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
