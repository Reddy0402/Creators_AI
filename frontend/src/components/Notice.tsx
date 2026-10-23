import { CheckCircle2 } from 'lucide-react'

export function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950 px-4 py-2.5 text-sm text-emerald-200 shadow-lg"
    >
      <CheckCircle2 className="size-4" aria-hidden />
      {message}
    </div>
  )
}
