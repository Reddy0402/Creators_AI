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

const STYLE_BADGES: Record<string, string> = {
  'Catchy & Punchy': 'bg-coral-soft',
  'Minimalist & Modern': 'bg-lav-soft',
  'Emotional & Inspiring': 'bg-lime-soft',
  'Benefit-Driven': 'bg-success-soft',
  'Playful & Clever': 'bg-warning-soft',
}

function styleBadgeClass(style: string) {
  return STYLE_BADGES[style] ?? 'bg-canvas'
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
      <section className="card space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-none border-2 border-ink bg-coral text-ink shadow-brut-xs">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                Product Taglines & Brand Slogans Studio
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Create memorable, high-converting taglines and brand slogans tailored to{' '}
              <span className="font-semibold text-ink">{campaign.product_or_service}</span>.
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
          <label className="text-xs font-bold tracking-wide text-ink-mute uppercase">
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
                  aria-pressed={active}
                  className={`cursor-pointer rounded-none border-2 border-ink px-3 py-1.5 text-xs font-bold transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'bg-lime text-ink shadow-brut-xs'
                      : 'bg-surface text-ink-soft hover:text-ink active:translate-x-[2px] active:translate-y-[2px]'
                  }`}
                >
                  {style}
                </button>
              )
            })}
          </div>
        </div>

        {/* Count & Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink pt-4">
          <div className="flex items-center gap-3 text-sm font-medium text-ink-soft">
            <span>Variations:</span>
            {[3, 5, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                disabled={generating}
                aria-pressed={count === n}
                className={`size-9 cursor-pointer rounded-none border-2 border-ink text-xs font-bold transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                  count === n ? 'bg-lime text-ink shadow-brut-xs' : 'bg-surface text-ink-soft'
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
            {generating ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
            {generating ? 'Crafting Taglines…' : 'Generate Taglines'}
          </button>
        </div>
      </section>

      {/* Generated Taglines Results */}
      {generatedList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink">
              <span className="flex size-6 items-center justify-center rounded-none border-2 border-ink bg-lime text-ink shadow-brut-xs">
                <Lightbulb className="size-3.5" aria-hidden />
              </span>
              Generated Taglines ({generatedList.length})
            </h3>
            <span className="text-xs font-medium text-ink-mute">Click a tagline to copy</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {generatedList.map((item, idx) => {
              const isCopied = copiedIndex === idx
              const isSaved =
                savedKeys.has(item.tagline) ||
                savedTaglines.some((a) => (a.content as Tagline).tagline === item.tagline)
              const isSaving = savingKey === item.tagline

              return (
                <div
                  key={idx}
                  className="card group flex flex-col justify-between p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`chip ${styleBadgeClass(item.style)}`}>
                        {item.style || 'Custom'}
                      </span>

                      <div className="flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.tagline, idx)}
                          className="btn-ghost"
                          title="Copy tagline"
                          aria-label="Copy tagline"
                        >
                          {isCopied ? (
                            <Check className="size-4 text-success" aria-hidden />
                          ) : (
                            <Copy className="size-4" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveTagline(item)}
                          disabled={isSaved || isSaving}
                          className="btn-ghost"
                          title={isSaved ? 'Saved to campaign' : 'Save to campaign'}
                          aria-label={isSaved ? 'Saved to campaign' : 'Save to campaign'}
                        >
                          <Star
                            className={`size-4 ${isSaved ? 'fill-coral text-coral' : ''}`}
                            aria-hidden
                          />
                        </button>
                      </div>
                    </div>

                    <blockquote
                      onClick={() => copyToClipboard(item.tagline, idx)}
                      className="cursor-pointer font-display text-lg font-bold tracking-tight text-ink"
                    >
                      “{item.tagline}”
                    </blockquote>

                    {item.rationale && (
                      <p className="text-xs leading-relaxed text-ink-soft">
                        <span className="font-semibold text-ink">Why it fits: </span>
                        {item.rationale}
                      </p>
                    )}
                  </div>

                  {item.keywords && item.keywords.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t-2 border-ink pt-3">
                      {item.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-none border-2 border-ink bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink">
              <Star className="size-4 fill-coral text-coral" aria-hidden />
              Saved Campaign Taglines ({savedTaglines.length})
            </h3>
            <p className="mt-1 text-xs font-medium text-ink-mute">
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
                <Copy className="size-3.5" aria-hidden />
                Copy all
              </button>
              <button
                type="button"
                onClick={exportAsText}
                className="btn-secondary py-1 text-xs"
                title="Download as TXT"
              >
                <FileText className="size-3.5" aria-hidden />
                TXT
              </button>
              <button
                type="button"
                onClick={exportAsCSV}
                className="btn-secondary py-1 text-xs"
                title="Download as CSV spreadsheet"
              >
                <FileSpreadsheet className="size-3.5" aria-hidden />
                CSV
              </button>
              <button
                type="button"
                onClick={exportAsJSON}
                className="btn-secondary py-1 text-xs"
                title="Download as JSON"
              >
                <Download className="size-3.5" aria-hidden />
                JSON
              </button>
            </div>
          )}
        </div>

        {savedTaglines.length === 0 ? (
          <div className="rounded-none border-2 border-dashed border-ink/40 bg-surface p-8 text-center">
            <Sparkles className="mx-auto size-8 text-ink-mute" aria-hidden />
            <h4 className="mt-2 text-sm font-bold text-ink">No taglines saved yet</h4>
            <p className="mt-1 text-xs font-medium text-ink-mute">
              Click &quot;Generate Taglines&quot; above and star your favorites to save them to this campaign.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {savedTaglines.map((asset) => {
              const c = asset.content as Tagline

              return (
                <div key={asset.id} className="card flex flex-col justify-between p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`chip ${styleBadgeClass(c.style)}`}>
                        {c.style || 'Custom'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(c.tagline)}
                          className="btn-ghost"
                          title="Copy tagline"
                          aria-label="Copy tagline"
                        >
                          <Copy className="size-3.5" aria-hidden />
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
                          className="btn-ghost text-error"
                          title="Delete tagline"
                          aria-label="Delete tagline"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>

                    <p className="font-display text-base font-bold text-ink">“{c.tagline}”</p>
                    {c.rationale && (
                      <p className="text-xs leading-relaxed text-ink-soft">{c.rationale}</p>
                    )}
                  </div>

                  {c.keywords && c.keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 border-t-2 border-ink pt-2">
                      {c.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-none border-2 border-ink bg-canvas px-1.5 py-0.5 text-[10px] font-bold text-ink"
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
