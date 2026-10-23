import { Image as ImageIcon } from 'lucide-react'
import type { VisualAsset } from '../types/visual'
import { EmptyState } from './EmptyState'
import { VisualAssetCard } from './VisualAssetCard'

interface Props {
  visuals: VisualAsset[]
  onView: (visual: VisualAsset) => void
  onDelete: (visual: VisualAsset) => void
  deletingId: number | null
}

export function VisualAssetGallery({ visuals, onView, onDelete, deletingId }: Props) {
  if (visuals.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No visuals yet"
        description="Upload a product photo or generate a visual. Saved images appear here."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visuals.map((visual) => (
        <VisualAssetCard
          key={visual.id}
          visual={visual}
          onView={onView}
          onDelete={onDelete}
          deleting={deletingId === visual.id}
        />
      ))}
    </div>
  )
}
