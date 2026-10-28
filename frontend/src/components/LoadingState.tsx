import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-sm font-medium text-ink-soft"
    >
      <span className="flex size-11 items-center justify-center rounded-none border-2 border-ink bg-surface shadow-brut-sm">
        <Spinner className="size-5 text-ink" />
      </span>
      {label}
    </div>
  )
}
