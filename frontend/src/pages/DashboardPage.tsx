import { FileText, FolderOpen, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../api/campaignApi'
import { CampaignCard } from '../components/CampaignCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingState } from '../components/LoadingState'
import { errorMessage } from '../lib/format'
import type { CampaignSummary } from '../types/campaign'

export function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">Your campaigns and everything created for them.</p>
        </div>
        <Link to="/campaigns/new" className="btn-primary">
          <Plus className="size-4" aria-hidden />
          Create campaign
        </Link>
      </header>

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!campaigns && !error && <LoadingState label="Loading your campaigns…" />}

      {campaigns && (
        <>
          <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2">
            <Stat icon={FolderOpen} label="Campaigns" value={campaigns.length} />
            <Stat icon={FileText} label="Creative assets" value={totalAssets} />
          </section>

          <section aria-labelledby="recent-heading" className="space-y-4">
            <h2 id="recent-heading" className="text-lg font-semibold text-zinc-100">
              Recent campaigns
            </h2>
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
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaigns.slice(0, 8).map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
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
}: {
  icon: typeof FolderOpen
  label: string
  value: number
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="rounded-lg bg-accent/15 p-2.5 text-accent">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-2xl font-semibold text-zinc-50">{value}</p>
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  )
}
