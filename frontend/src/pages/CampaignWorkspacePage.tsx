import { ArrowLeft, Compass, FileText, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react'
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
import { TaglinesStudio } from '../components/TaglinesStudio'
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

  const dirtyIds = useRef(new Set<number>())
  const [dirtyCount, setDirtyCount] = useState(0)
  const [strategyDirty, setStrategyDirty] = useState(false)
  useUnsavedGuard(strategyDirty || dirtyCount > 0)

  type WorkspaceTab = 'taglines' | 'content' | 'visuals' | 'strategy'
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('content')

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

  const copyCount = assets.filter((a) => a.content_type !== 'tagline').length
  const taglineCount = assets.filter((a) => a.content_type === 'tagline').length

  const tabs: { key: WorkspaceTab; label: string; icon: typeof FileText; count?: number }[] = [
    { key: 'content', label: 'Marketing Copy', icon: FileText, count: copyCount },
    { key: 'taglines', label: 'Taglines & Slogans', icon: Sparkles, count: taglineCount },
    { key: 'visuals', label: 'Visual Assets', icon: ImageIcon, count: visuals.length },
    { key: 'strategy', label: 'Strategy & Brief', icon: Compass },
  ]

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <BackLink />
        {imageError && <ErrorMessage message={imageError} />}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                  {campaign.name}
                </h1>
                <p className="mt-2 text-sm font-medium text-ink-soft">
                  {campaign.product_or_service} · {campaign.platform} · {campaign.tone} tone
                </p>
              </div>
              <button
                className="btn-secondary text-error"
                onClick={deleteCampaign}
                disabled={deleting}
              >
                <Trash2 className="size-4" aria-hidden /> Delete campaign
              </button>
            </div>
          </div>
          {hero && (
            <div className="aspect-square w-full overflow-hidden rounded-none border-2 border-ink bg-canvas shadow-brut sm:w-44">
              <SafeImage
                src={hero.url}
                alt={`${campaign.name} product image`}
                loading="eager"
                className="size-full object-cover"
              />
            </div>
          )}
        </div>
        <details className="card group p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-ink select-none">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
            Campaign brief
          </summary>
          <dl className="mt-4 grid gap-3 border-t-2 border-ink pt-4 md:grid-cols-2">
            <Fact label="Target audience" value={campaign.target_audience} />
            <Fact label="Objective" value={campaign.objective} />
            <Fact label="Brief and product facts" value={campaign.brief || 'None provided'} />
          </dl>
        </details>
      </header>

      {/* Navigation tabs */}
      <nav aria-label="Campaign sections" className="flex flex-wrap gap-3">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-pressed={active}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-none border-2 border-ink px-4 py-2.5 text-sm font-bold transition-[transform,box-shadow] duration-100 ${
                active
                  ? 'bg-lime text-ink shadow-brut-xs'
                  : 'bg-surface text-ink-soft hover:text-ink active:translate-x-[2px] active:translate-y-[2px]'
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {typeof count === 'number' && count > 0 && (
                <span
                  className={`rounded-none border-2 border-ink px-1.5 py-0.5 text-xs font-bold ${
                    active ? 'bg-surface' : 'bg-canvas'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Tab Panels */}
      {activeTab === 'taglines' && (
        <TaglinesStudio
          campaign={campaign}
          savedAssets={assets.filter((a) => a.content_type === 'tagline')}
          onAssetSaved={(newAsset) => setAssets((current) => [newAsset, ...current])}
          onAssetDeleted={(id) => setAssets((current) => current.filter((a) => a.id !== id))}
          onNotify={showNotice}
        />
      )}

      {activeTab === 'visuals' && (
        <VisualAssetsSection
          campaignId={campaign.id}
          visuals={visuals}
          onChange={setVisuals}
          imageReady={imageReady}
          onNotify={showNotice}
        />
      )}

      {activeTab === 'strategy' && (
        <StrategyPanel
          campaign={campaign}
          onCampaignChange={setCampaign}
          onSaved={showNotice}
          onDirtyChange={setStrategyDirty}
        />
      )}

      {activeTab === 'content' && (
        <section aria-labelledby="content-heading" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="content-heading" className="font-display text-lg font-bold text-ink">
                Marketing Copy
              </h2>
              <p className="text-sm text-ink-soft">
                Generate social posts, ad copies, video scripts, emails and more tailored to your
                campaign.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('taglines')}
              className="btn-secondary"
            >
              <Sparkles className="size-4" aria-hidden /> Try Taglines & Slogans Studio
            </button>
          </div>

          {campaign.strategy ? (
            <GeneratePanel
              defaultPlatform={campaign.platform}
              defaultTone={campaign.tone}
              generating={generating}
              onGenerate={generate}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-none border-2 border-ink bg-surface px-4 py-3 text-sm font-medium text-ink shadow-brut-xs">
              <span>Generate a campaign strategy first to give your content deep brand alignment.</span>
              <button
                type="button"
                onClick={() => setActiveTab('strategy')}
                className="btn-secondary"
              >
                Go to Strategy
              </button>
            </div>
          )}

          {generateError && <ErrorMessage message={generateError} />}
          {generating && <LoadingState label="Preparing your content…" />}

          {copyCount === 0 && !generating ? (
            <EmptyState
              icon={FileText}
              title="No copy generated yet"
              description="Create a social post, ad, video script or email above to begin."
            />
          ) : (
            <div className="space-y-4">
              {assets
                .filter((a) => a.content_type !== 'tagline')
                .map((asset) => (
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
      )}

      <Notice message={notice} />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden /> Dashboard
    </Link>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-ink-mute uppercase">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{value}</dd>
    </div>
  )
}
