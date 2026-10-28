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
    <div className="flex flex-col items-center gap-4 rounded-none border-2 border-dashed border-ink/40 bg-surface px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-none border-2 border-ink bg-lime text-ink shadow-brut-sm">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-md text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
