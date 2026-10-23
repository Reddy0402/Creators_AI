import { ArrowLeft, FileText, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { campaignApi } from '../api/campaignApi'
import { systemApi } from '../api/systemApi'
import { visualApi } from '../api/visualApi'
import { ContentCard } from '../components/ContentCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { GeneratePanel } from '../components/GeneratePanel'
import { LoadingState } from '../components/LoadingState'
import { Notice } from '../components/Notice'
import { SafeImage } from '../components/SafeImage'
import { StrategyPanel } from '../components/StrategyPanel'
import { VisualAssetsSection } from '../components/VisualAssetsSection'
import { useNotice } from '../hooks/useNotice'
import { useUnsavedGuard } from '../hooks/useUnsavedGuard'
import { errorMessage } from '../lib/format'
import type { Asset, GenerateContentInput } from '../types/asset'
import type { Campaign } from '../types/campaign'
import type { VisualAsset } from '../types/visual'

export function CampaignWorkspacePage() {
  const params = useParams()
  const campaignId = Number(params.id)
  const navigate = useNavigate()
  const location = useLocation()
  const { message: notice, show: showNotice } = useNotice()
  // Set when the campaign was saved but its image upload failed (see CreateCampaignPage).
  const imageError = (location.state as { imageError?: string } | null)?.imageError ?? null

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [visuals, setVisuals] = useState<VisualAsset[]>([])
  const [imageReady, setImageReady] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<{ message: string; notFound: boolean } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Which editors currently hold unsaved edits.
  const dirtyIds = useRef(new Set<number>())
  const [dirtyCount, setDirtyCount] = useState(0)
  const [strategyDirty, setStrategyDirty] = useState(false)
  useUnsavedGuard(strategyDirty || dirtyCount > 0)

  const handleAssetDirty = useCallback((id: number, dirty: boolean) => {
    const ids = dirtyIds.current
    if (dirty === ids.has(id)) return
    if (dirty) ids.add(id)
    else ids.delete(id)
    setDirtyCount(ids.size)
  }, [])

  const idIsValid = Number.isInteger(campaignId)

  const load = useCallback(async () => {
    try {
      const [loadedCampaign, loadedAssets, loadedVisuals] = await Promise.all([
        campaignApi.get(campaignId),
        campaignApi.listAssets(campaignId),
        visualApi.listForCampaign(campaignId),
      ])
      setCampaign(loadedCampaign)
      setAssets(loadedAssets)
      setVisuals(loadedVisuals)
      setLoadError(null)
    } catch (err) {
      setLoadError({
        message: errorMessage(err),
        notFound: err instanceof ApiError && err.status === 404,
      })
    }
  }, [campaignId])

  useEffect(() => {
    // Loads data from the API. State is only set after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    if (idIsValid) void load()
  }, [idIsValid, load])

  useEffect(() => {
    // Tells the visuals section whether generation is set up, so it can explain why not.
    systemApi
      .health()
      .then((status) => setImageReady(status.image_configured))
      .catch(() => setImageReady(false))
  }, [])

  const hero = visuals.find((visual) => visual.asset_type === 'product_image') ?? visuals[0]

  if (!idIsValid) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={FileText}
          title="Campaign not found"
          description="The link may be incorrect."
          action={
            <Link to="/" className="btn-primary">
              Back to dashboard
            </Link>
          }
        />
      </div>
    )
  }

  async function generate(input: GenerateContentInput) {
    if (generating) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const created = await campaignApi.generateContent(campaignId, input)
      setAssets((current) => [...created, ...current])
      showNotice(created.length === 1 ? 'New content added' : `${created.length} new items added`)
    } catch (err) {
      setGenerateError(errorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  // "Explore another version": same type, platform and tone as this item, saved as a new asset.
  async function exploreAnother(asset: Asset) {
    if (!campaign) return
    const created = await campaignApi.generateContent(campaignId, {
      content_type: asset.content_type,
      platform: asset.platform as GenerateContentInput['platform'],
      tone: campaign.tone,
      variations: 1,
      instructions: '',
    })
    setAssets((current) => [...created, ...current])
    showNotice('New version added')
  }

  async function deleteCampaign() {
    if (!campaign || deleting) return
    const ok = window.confirm(
      `Delete “${campaign.name}” and all of its content? This can’t be undone.`,
    )
    if (!ok) return
    setDeleting(true)
    try {
      await campaignApi.remove(campaign.id)
      dirtyIds.current.clear()
      setDirtyCount(0)
      setStrategyDirty(false)
      // Wait a tick so the unsaved-changes guard sees the cleared state before navigating.
      setTimeout(() => navigate('/'), 0)
    } catch (err) {
      setGenerateError(errorMessage(err))
      setDeleting(false)
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <BackLink />
        {loadError.notFound ? (
          <EmptyState
            icon={FileText}
            title="Campaign not found"
            description="It may have been deleted."
            action={
              <Link to="/" className="btn-primary">
                Back to dashboard
              </Link>
            }
          />
        ) : (
          <ErrorMessage message={loadError.message} onRetry={load} />
        )}
      </div>
    )
  }

  if (!campaign) return <LoadingState label="Opening your campaign…" />

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <BackLink />
        {imageError && <ErrorMessage message={imageError} />}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{campaign.name}</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {campaign.product_or_service} · {campaign.platform} · {campaign.tone} tone
                </p>
              </div>
              <button className="btn-ghost" onClick={deleteCampaign} disabled={deleting}>
                <Trash2 className="size-4" aria-hidden /> Delete campaign
              </button>
            </div>
          </div>
          {hero && (
            <div className="aspect-square w-full overflow-hidden rounded-xl border border-line bg-raised sm:w-44">
              <SafeImage
                src={hero.url}
                alt={`${campaign.name} product image`}
                loading="eager"
                className="size-full object-cover"
              />
            </div>
          )}
        </div>
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-300">Campaign brief</summary>
          <dl className="mt-3 grid gap-3 text-zinc-400 md:grid-cols-2">
            <Fact label="Target audience" value={campaign.target_audience} />
            <Fact label="Objective" value={campaign.objective} />
            <Fact label="Brief and product facts" value={campaign.brief || 'None provided'} />
          </dl>
        </details>
      </header>

      <VisualAssetsSection
        campaignId={campaign.id}
        visuals={visuals}
        onChange={setVisuals}
        imageReady={imageReady}
        onNotify={showNotice}
      />

      <StrategyPanel
        campaign={campaign}
        onCampaignChange={setCampaign}
        onSaved={showNotice}
        onDirtyChange={setStrategyDirty}
      />

      <section aria-labelledby="content-heading" className="space-y-4">
        <h2 id="content-heading" className="text-lg font-semibold text-zinc-100">
          Create content
        </h2>

        {campaign.strategy ? (
          <GeneratePanel
            defaultPlatform={campaign.platform}
            defaultTone={campaign.tone}
            generating={generating}
            onGenerate={generate}
          />
        ) : (
          <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-zinc-400">
            Generate a campaign strategy first. Your content will follow it.
          </p>
        )}

        {generateError && <ErrorMessage message={generateError} />}
        {generating && <LoadingState label="Preparing your content…" />}

        {assets.length === 0 && !generating ? (
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Create a social post, ad, video script or email and it will appear here."
          />
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <ContentCard
                key={asset.id}
                asset={asset}
                onUpdated={(updated) =>
                  setAssets((current) => current.map((a) => (a.id === updated.id ? updated : a)))
                }
                onDeleted={(id) => setAssets((current) => current.filter((a) => a.id !== id))}
                onRefined={(revised) => setAssets((current) => [revised, ...current])}
                onExploreAnother={exploreAnother}
                onNotify={showNotice}
                onDirtyChange={handleAssetDirty}
              />
            ))}
          </div>
        )}
      </section>

      <Notice message={notice} />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100">
      <ArrowLeft className="size-4" aria-hidden /> Dashboard
    </Link>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-zinc-300">{value}</dd>
    </div>
  )
}
