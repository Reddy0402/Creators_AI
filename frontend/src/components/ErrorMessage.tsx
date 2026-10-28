import { AlertCircle } from 'lucide-react'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-none border-2 border-ink bg-error-soft px-4 py-3 text-sm font-medium text-ink shadow-brut-xs"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="cursor-pointer whitespace-nowrap font-semibold underline underline-offset-2 hover:text-error"
        >
          Try again
        </button>
      )}
    </div>
  )
}
