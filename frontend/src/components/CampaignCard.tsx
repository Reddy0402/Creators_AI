import { FileText, ImageOff, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/format'
import type { CampaignSummary } from '../types/campaign'
import { SafeImage } from './SafeImage'

export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="card block overflow-hidden transition-colors hover:border-zinc-600"
    >
      {/* Only a real uploaded or generated image is shown; otherwise a neutral placeholder. */}
      <div className="aspect-[16/9] w-full bg-raised">
        {campaign.thumbnail_url ? (
          <SafeImage
            src={campaign.thumbnail_url}
            alt={`${campaign.name} product image`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-xs text-zinc-600">
            <ImageOff className="size-5" aria-hidden />
            No image yet
          </div>
        )}
      </div>
      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-100">{campaign.name}</h3>
        <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
          {campaign.platform}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{campaign.product_or_service}</p>
      <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
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
