import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <div className="rounded-full bg-raised p-3 text-accent">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      {description && <p className="max-w-md text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
