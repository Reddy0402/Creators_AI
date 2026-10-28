import { FileText, ImageOff, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/format'
import type { CampaignStatus, CampaignSummary } from '../types/campaign'
import { SafeImage } from './SafeImage'

const STATUS_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-canvas' },
  active: { label: 'Active', className: 'bg-success-soft' },
  completed: { label: 'Completed', className: 'bg-lav-soft' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return <span className={`chip ${style.className}`}>{style.label}</span>
}

export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="card block overflow-hidden transition-[transform,box-shadow] duration-100 hover:shadow-brut active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      {/* Only a real uploaded or generated image is shown; otherwise a neutral placeholder. */}
      <div className="aspect-[16/9] w-full border-b-2 border-ink bg-canvas">
        {campaign.thumbnail_url ? (
          <SafeImage
            src={campaign.thumbnail_url}
            alt={`${campaign.name} product image`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-xs font-medium text-ink-mute">
            <ImageOff className="size-5" aria-hidden />
            No image yet
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">{campaign.name}</h3>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <StatusBadge status={campaign.status} />
            <span className="chip bg-canvas">{campaign.platform}</span>
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{campaign.product_or_service}</p>
        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-mute">
          <span className="flex items-center gap-1.5">
            <Target className="size-3.5" aria-hidden />
            {campaign.has_strategy ? 'Strategy ready' : 'No strategy yet'}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="size-3.5" aria-hidden />
            {campaign.asset_count} {campaign.asset_count === 1 ? 'asset' : 'assets'}
          </span>
          <span className="ml-auto">{formatDate(campaign.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}
