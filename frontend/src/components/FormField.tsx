import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, htmlFor, error, hint, required, children }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-coral" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-mute">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-error">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
