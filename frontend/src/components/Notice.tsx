import { CheckCircle2 } from 'lucide-react'

export function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-none border-2 border-ink bg-success-soft px-4 py-2.5 text-sm font-semibold text-ink shadow-brut"
    >
      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
      {message}
    </div>
  )
}
