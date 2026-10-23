import { Download, Sparkles, Trash2 } from 'lucide-react'
import { formatDate } from '../lib/format'
import { visualTypeLabel, type VisualAsset } from '../types/visual'
import { SafeImage } from './SafeImage'
import { Spinner } from './LoadingState'

interface Props {
  visual: VisualAsset
  onView: (visual: VisualAsset) => void
  onDelete: (visual: VisualAsset) => void
  deleting: boolean
}

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function VisualAssetCard({ visual, onView, onDelete, deleting }: Props) {
  const typeLabel = visualTypeLabel(visual.asset_type)
  const fileName = `${visual.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'image'}.${EXTENSION[visual.mime_type] ?? 'img'}`

  return (
    <article className="card flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => onView(visual)}
        aria-label={`View ${visual.title} larger`}
        className="block aspect-[4/3] w-full bg-raised"
      >
        <SafeImage
          src={visual.url}
          alt={`${visual.title}, ${typeLabel.toLowerCase()}`}
          className="size-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          fallbackText="This image couldn't be loaded. Its details are kept."
        />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-medium text-accent">{typeLabel}</span>
          {visual.source === 'generated' && (
            <span className="flex items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-zinc-400">
              <Sparkles className="size-3" aria-hidden /> AI illustration
            </span>
          )}
        </div>
        <h3 className="truncate font-medium text-zinc-100" title={visual.title}>
          {visual.title}
        </h3>
        <p className="text-xs text-zinc-500">
          {visual.width}×{visual.height} · {formatDate(visual.created_at)}
        </p>
        {visual.prompt && (
          <p className="line-clamp-2 text-xs text-zinc-500" title={visual.prompt}>
            {visual.prompt}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <a href={visual.url} download={fileName} className="btn-secondary text-xs">
            <Download className="size-3.5" aria-hidden /> Download
          </a>
          <button
            type="button"
            onClick={() => onDelete(visual)}
            disabled={deleting}
            aria-label={`Delete ${visual.title}`}
            className="btn-ghost ml-auto text-xs hover:text-red-400"
          >
            {deleting ? <Spinner /> : <Trash2 className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  )
}
