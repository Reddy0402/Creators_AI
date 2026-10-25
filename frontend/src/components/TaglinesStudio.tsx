import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { campaignApi } from '../api/campaignApi'
import { errorMessage } from '../lib/format'
import {
  TAGLINE_STYLES,
  type Asset,
  type Tagline,
  type TaglineStyle,
} from '../types/asset'
import type { Campaign } from '../types/campaign'
import { ErrorMessage } from './ErrorMessage'
import { FormField } from './FormField'
import { Spinner } from './LoadingState'

interface TaglinesStudioProps {
  campaign: Campaign
  savedAssets: Asset[]
  onAssetSaved: (newAsset: Asset) => void
  onAssetDeleted: (id: number) => void
  onNotify: (msg: string) => void
}

const STYLE_BADGES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  'Catchy & Punchy': {
    label: 'Catchy & Punchy',
    color: 'text-amber-300',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  'Minimalist & Modern': {
    label: 'Minimalist & Modern',
    color: 'text-sky-300',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  'Emotional & Inspiring': {
    label: 'Emotional & Inspiring',
    color: 'text-pink-300',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/10',
  },
  'Benefit-Driven': {
    label: 'Benefit-Driven',
    color: 'text-emerald-300',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  'Playful & Clever': {
    label: 'Playful & Clever',
    color: 'text-purple-300',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
}

function getStyleBadge(style: string) {
  return (
    STYLE_BADGES[style] ?? {
      label: style || 'Custom',
      color: 'text-indigo-300',
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-500/10',
    }
  )
}

export function TaglinesStudio({
  campaign,
  savedAssets,
  onAssetSaved,
  onAssetDeleted,
  onNotify,
}: TaglinesStudioProps) {
  const [companyName, setCompanyName] = useState(campaign.name)
  const [industry, setIndustry] = useState('')
  const [differentiator, setDifferentiator] = useState(campaign.objective || '')
  const [selectedStyle, setSelectedStyle] = useState<TaglineStyle>('All Styles')
  const [count, setCount] = useState<number>(5)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedList, setGeneratedList] = useState<Tagline[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const savedTaglines = savedAssets.filter((a) => a.content_type === 'tagline')

  async function handleGenerate() {
    if (generating) return
    setGenerating(true)
    setError(null)
    try {
      const results = await campaignApi.generateTaglines(campaign.id, {
        company_name: companyName.trim() || campaign.name,
        industry: industry.trim(),
        differentiator: differentiator.trim(),
        style: selectedStyle,
        count,
      })
      setGeneratedList(results)
      onNotify(`Generated ${results.length} new product taglines`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  async function copyToClipboard(text: string, index?: number) {
    try {
      await navigator.clipboard.writeText(text)
      if (index !== undefined) {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      }
      onNotify('Copied to clipboard')
    } catch {
      onNotify('Failed to copy to clipboard')
    }
  }

  async function handleSaveTagline(item: Tagline) {
    if (savedKeys.has(item.tagline) || savingKey === item.tagline) return
    setSavingKey(item.tagline)
    try {
      const asset = await campaignApi.saveTagline(campaign.id, {
        tagline: item.tagline,
        style: item.style,
        rationale: item.rationale,
        keywords: item.keywords,
      })
      onAssetSaved(asset)
      setSavedKeys((prev) => new Set([...prev, item.tagline]))
      onNotify('Saved to campaign taglines')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingKey(null)
    }
  }

  function exportAsText() {
    if (savedTaglines.length === 0) return
    const lines = [
      `Product Taglines & Brand Slogans`,
      `Campaign: ${campaign.name}`,
      `Product: ${campaign.product_or_service}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `----------------------------------------\n`,
      ...savedTaglines.map((a, i) => {
        const c = a.content as Tagline
        return `${i + 1}. "${c.tagline}"\n   Style: ${c.style}\n   Rationale: ${c.rationale || 'N/A'}\n`
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, `${campaign.name.toLowerCase().replace(/\s+/g, '-')}-taglines.txt`)
    onNotify('Exported TXT file')
  }

  function exportAsCSV() {
    if (savedTaglines.length === 0) return
    const headers = ['Tagline', 'Style', 'Rationale', 'Keywords']
    const rows = savedTaglines.map((a) => {
      const c = a.content as Tagline
      return [
        `"${(c.tagline || '').replace(/"/g, '""')}"`,
        `"${(c.style || '').replace(/"/g, '""')}"`,
        `"${(c.rationale || '').replace(/"/g, '""')}"`,
        `"${(c.keywords || []).join('; ').replace(/"/g, '""')}"`,
      ]
    })
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `${campaign.name.toLowerCase().replace(/\s+/g, '-')}-taglines.csv`)
    onNotify('Exported CSV file')
  }

  function exportAsJSON() {
    if (savedTaglines.length === 0) return
    const data = {
      campaign: campaign.name,
      product: campaign.product_or_service,
      taglines: savedTaglines.map((a) => a.content),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    downloadBlob(blob, `${campaign.name.toLowerCase().replace(/\s+/g, '-')}-taglines.json`)
    onNotify('Exported JSON file')
  }

  function copyAllSaved() {
    if (savedTaglines.length === 0) return
    const text = savedTaglines
      .map((a, i) => {
        const c = a.content as Tagline
        return `${i + 1}. "${c.tagline}" (${c.style})`
      })
      .join('\n')
    void copyToClipboard(text)
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Studio Header & Configuration Card */}
      <section className="card p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
                Product Taglines & Brand Slogans Studio
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-zinc-400">
              Create memorable, high-converting taglines and brand slogans tailored to{' '}
              <span className="text-zinc-200 font-medium">{campaign.product_or_service}</span>.
            </p>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Company & Voice Settings Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Company or Brand Name" htmlFor="company-name">
            <input
              id="company-name"
              className="field"
              value={companyName}
              placeholder="e.g. EcoSip"
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={generating}
            />
          </FormField>

          <FormField label="Industry / Product Category" htmlFor="industry-name">
            <input
              id="industry-name"
              className="field"
              value={industry}
              placeholder="e.g. Eco-friendly Drinkware"
              onChange={(e) => setIndustry(e.target.value)}
              disabled={generating}
            />
          </FormField>

          <FormField label="Key Differentiator / USP" htmlFor="differentiator">
            <input
              id="differentiator"
              className="field"
              value={differentiator}
              placeholder="e.g. Cold for 24 hours, recycled steel"
              onChange={(e) => setDifferentiator(e.target.value)}
              disabled={generating}
            />
          </FormField>
        </div>

        {/* Style Selection Chips */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Tagline Style
          </label>
          <div className="flex flex-wrap gap-2">
            {TAGLINE_STYLES.map((style) => {
              const active = selectedStyle === style
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => setSelectedStyle(style)}
                  disabled={generating}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-accent text-white shadow-sm ring-1 ring-accent'
                      : 'border border-line bg-raised text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
                  }`}
                >
                  {style}
                </button>
              )
            })}
          </div>
        </div>

        {/* Count & Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>Variations:</span>
            {[3, 5, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                disabled={generating}
                className={`size-8 rounded-md text-xs font-semibold transition-colors ${
                  count === n
                    ? 'bg-accent text-white'
                    : 'border border-line bg-raised text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <Spinner /> : <Sparkles className="size-4" />}
            {generating ? 'Crafting Taglines…' : 'Generate Taglines'}
          </button>
        </div>
      </section>

      {/* Generated Taglines Results */}
      {generatedList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-400" />
              Generated Taglines ({generatedList.length})
            </h3>
            <span className="text-xs text-zinc-400">Click a tagline to copy</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {generatedList.map((item, idx) => {
              const badge = getStyleBadge(item.style)
              const isCopied = copiedIndex === idx
              const isSaved =
                savedKeys.has(item.tagline) ||
                savedTaglines.some((a) => (a.content as Tagline).tagline === item.tagline)
              const isSaving = savingKey === item.tagline

              return (
                <div
                  key={idx}
                  className="card group relative flex flex-col justify-between p-5 transition-all hover:border-zinc-500 hover:bg-[#16161f]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.color} ${badge.border}`}
                      >
                        {badge.label}
                      </span>

                      <div className="flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.tagline, idx)}
                          className="btn-ghost p-1.5 text-xs"
                          title="Copy tagline"
                        >
                          {isCopied ? (
                            <Check className="size-4 text-emerald-400" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveTagline(item)}
                          disabled={isSaved || isSaving}
                          className={`btn-ghost p-1.5 text-xs ${
                            isSaved ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-300'
                          }`}
                          title={isSaved ? 'Saved to campaign' : 'Save to campaign'}
                        >
                          <Star className={`size-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <blockquote
                      onClick={() => copyToClipboard(item.tagline, idx)}
                      className="cursor-pointer text-lg font-semibold tracking-tight text-zinc-50 transition-colors hover:text-accent"
                    >
                      “{item.tagline}”
                    </blockquote>

                    {item.rationale && (
                      <p className="text-xs leading-relaxed text-zinc-400">
                        <span className="font-medium text-zinc-300">Why it fits: </span>
                        {item.rationale}
                      </p>
                    )}
                  </div>

                  {item.keywords && item.keywords.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line/60 pt-3">
                      {item.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-raised/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400"
                        >
                          #{kw.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Saved Campaign Taglines Gallery */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Star className="size-4 text-amber-400 fill-amber-400" />
              Saved Campaign Taglines ({savedTaglines.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Approved taglines saved to this campaign that persist across sessions.
            </p>
          </div>

          {savedTaglines.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyAllSaved}
                className="btn-secondary py-1 text-xs"
                title="Copy all to clipboard"
              >
                <Copy className="size-3.5" />
                Copy all
              </button>
              <button
                type="button"
                onClick={exportAsText}
                className="btn-secondary py-1 text-xs"
                title="Download as TXT"
              >
                <FileText className="size-3.5" />
                TXT
              </button>
              <button
                type="button"
                onClick={exportAsCSV}
                className="btn-secondary py-1 text-xs"
                title="Download as CSV spreadsheet"
              >
                <FileSpreadsheet className="size-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={exportAsJSON}
                className="btn-secondary py-1 text-xs"
                title="Download as JSON"
              >
                <Download className="size-3.5" />
                JSON
              </button>
            </div>
          )}
        </div>

        {savedTaglines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface/50 p-8 text-center">
            <Sparkles className="mx-auto size-8 text-zinc-600" />
            <h4 className="mt-2 text-sm font-medium text-zinc-300">No taglines saved yet</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Click &quot;Generate Taglines&quot; above and star your favorites to save them to this campaign.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {savedTaglines.map((asset) => {
              const c = asset.content as Tagline
              const badge = getStyleBadge(c.style)

              return (
                <div
                  key={asset.id}
                  className="card flex flex-col justify-between p-4 transition-all hover:border-zinc-500"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.bg} ${badge.color} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(c.tagline)}
                          className="btn-ghost p-1 text-xs text-zinc-400 hover:text-zinc-100"
                          title="Copy tagline"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Delete tagline "${c.tagline}"?`)) {
                              await campaignApi.remove(asset.id)
                              onAssetDeleted(asset.id)
                              onNotify('Tagline removed')
                            }
                          }}
                          className="btn-ghost p-1 text-xs text-zinc-500 hover:text-red-400"
                          title="Delete tagline"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-base font-semibold text-zinc-100">“{c.tagline}”</p>
                    {c.rationale && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{c.rationale}</p>
                    )}
                  </div>

                  {c.keywords && c.keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 border-t border-line/60 pt-2">
                      {c.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-zinc-400"
                        >
                          #{kw.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
