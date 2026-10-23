import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-zinc-400"
    >
      <Spinner className="size-6 text-accent" />
      {label}
    </div>
  )
}
