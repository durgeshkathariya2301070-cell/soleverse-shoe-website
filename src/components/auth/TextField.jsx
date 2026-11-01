import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn.js'

// A labelled text box with an optional hint and error message, wired up for screen readers:
// the label is tied to the input, and the hint/error are read out when the input is focused.
export default function TextField({ id, label, error, hint, className, ...inputProps }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="eyebrow mb-2 block text-ink">
        {label}
      </label>
      <Input id={id} invalid={Boolean(error)} describedBy={describedBy} {...inputProps} />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass =
  'h-12 w-full rounded-xl border bg-surface px-4 text-base text-ink placeholder:text-muted/70 transition-colors disabled:cursor-not-allowed disabled:opacity-60'

function Input({ invalid, describedBy, type = 'text', className, ...props }) {
  return (
    <input
      type={type}
      aria-invalid={invalid ? 'true' : undefined}
      aria-describedby={describedBy}
      className={cn(inputClass, invalid ? 'border-red-600' : 'border-line hover:border-ink/40 focus:border-ink', className)}
      {...props}
    />
  )
}

// Same as TextField, plus an eye button to show or hide what you typed.
export function PasswordField({ id, label, error, hint, className, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="eyebrow mb-2 block text-ink">
        {label}
      </label>
      <div className="relative">
        <Input id={id} type={visible ? 'text' : 'password'} invalid={Boolean(error)} describedBy={describedBy} className="pr-12" {...inputProps} />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
