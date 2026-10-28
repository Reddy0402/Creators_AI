import { Download, X } from 'lucide-react'
import { useEffect } from 'react'
import { visualTypeLabel, type VisualAsset } from '../types/visual'
import { SafeImage } from './SafeImage'

interface Props {
  visual: VisualAsset | null
  onClose: () => void
}

export function ImagePreviewDialog({ visual, onClose }: Props) {
  useEffect(() => {
    if (!visual) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visual, onClose])

  if (!visual) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${visual.title} preview`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex max-h-[80vh] items-center justify-center overflow-hidden rounded-none border-2 border-ink bg-surface shadow-brut">
          <SafeImage
            src={visual.url}
            alt={`${visual.title}, ${visualTypeLabel(visual.asset_type).toLowerCase()}`}
            loading="eager"
            className="max-h-[80vh] w-auto max-w-full object-contain"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <div>
            <p className="font-display font-bold text-ink">{visual.title}</p>
            <p className="text-xs font-medium text-ink-mute">
              {visualTypeLabel(visual.asset_type)} · {visual.width}×{visual.height}
              {visual.source === 'generated' && ' · AI illustration, not a product photograph'}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={visual.url} download className="btn-secondary">
              <Download className="size-4" aria-hidden /> Download
            </a>
            <button type="button" onClick={onClose} className="btn-secondary">
              <X className="size-4" aria-hidden /> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
