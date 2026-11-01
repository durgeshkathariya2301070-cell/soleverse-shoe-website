import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '../../utils/cn.js'

// A coloured message box. tone: 'error' | 'success' | 'info'
// Errors use role="alert" (read out immediately); the others use role="status" (read out politely).
const tones = {
  error: { icon: CircleAlert, role: 'alert', box: 'border-red-200 bg-red-50 text-red-900' },
  success: { icon: CircleCheck, role: 'status', box: 'border-ink/15 bg-lime/40 text-ink' },
  info: { icon: Info, role: 'status', box: 'border-line bg-surface text-ink' },
}

export default function FormMessage({ tone = 'info', children, className }) {
  const { icon: Icon, role, box } = tones[tone]
  return (
    <div role={role} className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', box, className)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
