import { FileText, FolderOpen, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../api/campaignApi'
import { CampaignCard } from '../components/CampaignCard'
import { DatabaseStatusBanner } from '../components/DatabaseStatusBanner'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingState } from '../components/LoadingState'
import { errorMessage } from '../lib/format'
import type { CampaignStatus, CampaignSummary } from '../types/campaign'

// The grid shows at most this many cards by default; the rest stay reachable via "Show all".
const GRID_LIMIT = 8

const STATUS_OPTIONS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    try {
      setCampaigns(await campaignApi.list())
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    // Loads data from the API. State is only set after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
  }, [load])

  const totalAssets = campaigns?.reduce((sum, c) => sum + c.asset_count, 0) ?? 0

  const filtered = useMemo(() => {
    if (!campaigns) return []
    const q = query.trim().toLowerCase()
    return campaigns.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.product_or_service.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q)
      )
    })
  }, [campaigns, query, statusFilter])

  const hasHidden = !showAll && filtered.length > GRID_LIMIT
  const visible = hasHidden ? filtered.slice(0, GRID_LIMIT) : filtered
  const hasFilters = query.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('all')
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Your campaigns and everything created for them.
          </p>
        </div>
        <Link to="/campaigns/new" className="btn-primary">
          <Plus className="size-4" aria-hidden />
          Create campaign
        </Link>
      </header>

      <DatabaseStatusBanner />
      {error && <ErrorMessage message={error} onRetry={load} />}
      {!campaigns && !error && <LoadingState label="Loading your campaigns…" />}

      {campaigns && (
        <>
          <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2">
            <Stat icon={FolderOpen} label="Campaigns" value={campaigns.length} accent="bg-lime" />
            <Stat icon={FileText} label="Creative assets" value={totalAssets} accent="bg-lav-soft" />
          </section>

          <section aria-labelledby="recent-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="recent-heading" className="font-display text-lg font-bold text-ink">
                {campaigns.length === 1 ? 'Campaign' : 'Campaigns'}
                <span className="ml-2 text-sm font-medium text-ink-mute">
                  {hasFilters ? `${filtered.length} of ${campaigns.length}` : campaigns.length}
                </span>
              </h2>
            </div>

            {campaigns.length > 1 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-56 flex-1 sm:max-w-xs">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute"
                    aria-hidden
                  />
                  <label htmlFor="campaign-search" className="sr-only">
                    Search campaigns by name, product, or platform
                  </label>
                  <input
                    id="campaign-search"
                    type="search"
                    className="field pl-9"
                    placeholder="Search campaigns…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="status-filter" className="sr-only">
                    Filter by status
                  </label>
                  <select
                    id="status-filter"
                    className="field w-auto cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {hasFilters && (
                  <button type="button" className="btn-ghost" onClick={clearFilters}>
                    Clear
                  </button>
                )}
              </div>
            )}

            {campaigns.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No campaigns yet"
                description="Create your first campaign to build a strategy and start writing content."
                action={
                  <Link to="/campaigns/new" className="btn-primary">
                    <Plus className="size-4" aria-hidden />
                    Create campaign
                  </Link>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No campaigns match"
                description="Try a different search or clear the status filter."
                action={
                  <button type="button" className="btn-secondary" onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {visible.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
                {hasHidden && (
                  <div className="flex justify-center">
                    <button type="button" className="btn-secondary" onClick={() => setShowAll(true)}>
                      Show all {filtered.length} campaigns
                    </button>
                  </div>
                )}
                {showAll && filtered.length > GRID_LIMIT && (
                  <div className="flex justify-center">
                    <button type="button" className="btn-ghost" onClick={() => setShowAll(false)}>
                      Show recent only
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FolderOpen
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex size-12 items-center justify-center rounded-none border-2 border-ink text-ink shadow-brut-xs ${accent}`}>
        <Icon className="size-6" aria-hidden />
      </div>
      <div>
        <p className="font-display text-3xl font-bold text-ink tabular-nums">{value}</p>
        <p className="text-sm font-medium text-ink-soft">{label}</p>
      </div>
    </div>
  )
}
