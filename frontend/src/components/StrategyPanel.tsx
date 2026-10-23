import { Lightbulb, Pencil, RefreshCw, Save, Target, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { campaignApi } from '../api/campaignApi'
import { errorMessage } from '../lib/format'
import type { Campaign, Strategy } from '../types/campaign'
import { EmptyState } from './EmptyState'
import { ErrorMessage } from './ErrorMessage'
import { FormField } from './FormField'
import { LoadingState, Spinner } from './LoadingState'

interface Props {
  campaign: Campaign
  onCampaignChange: (campaign: Campaign) => void
  onSaved: (message: string) => void
  onDirtyChange: (dirty: boolean) => void
}

const lines = (items: string[]) => items.join('\n')
const parseLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

export function StrategyPanel({ campaign, onCampaignChange, onSaved, onDirtyChange }: Props) {
  const strategy = campaign.strategy
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Strategy | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = editing && draft !== null && JSON.stringify(draft) !== JSON.stringify(strategy)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  // Leaving the page unmounts this panel; make sure the page doesn't stay "dirty".
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  async function generate() {
    if (generating) return
    if (
      strategy &&
      !window.confirm('Replace the current strategy? Any edits you made to it will be lost.')
    ) {
      return
    }
    setGenerating(true)
    setError(null)
    try {
      onCampaignChange(await campaignApi.generateStrategy(campaign.id))
      setEditing(false)
      setDraft(null)
      onSaved('Strategy ready')
    } catch (err) {
      setError(errorMessage(err)) // any existing strategy is untouched
    } finally {
      setGenerating(false)
    }
  }

  function startEditing() {
    if (!strategy) return
    setDraft(structuredClone(strategy))
    setEditing(true)
    setError(null)
  }

  function cancelEditing() {
    if (dirty && !window.confirm('Discard your changes to the strategy?')) return
    setEditing(false)
    setDraft(null)
    setError(null)
  }

  async function save() {
    if (!draft || saving) return
    const missing = (
      [
        ['positioning', draft.positioning],
        ['audience summary', draft.audience_summary],
        ['core message', draft.core_message],
        ['value proposition', draft.value_proposition],
        ['recommended tone', draft.recommended_tone],
      ] as const
    ).find(([, value]) => !value.trim())
    if (missing) return setError(`The ${missing[0]} can't be empty.`)
    if (draft.concepts.some((c) => !c.name.trim() || !c.description.trim())) {
      return setError('Each creative concept needs a name and a description.')
    }
    if (draft.content_themes.length === 0) return setError('Add at least one content theme.')
    if (draft.calls_to_action.length === 0) return setError('Add at least one call to action.')

    setSaving(true)
    setError(null)
    try {
      onCampaignChange(await campaignApi.update(campaign.id, { strategy: draft }))
      setEditing(false)
      setDraft(null)
      onSaved('Saved successfully')
    } catch (err) {
      setError(errorMessage(err)) // the draft stays on screen
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="strategy-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="strategy-heading" className="text-lg font-semibold text-zinc-100">
          Campaign strategy
        </h2>
        <div className="flex gap-2">
          {strategy && !editing && (
            <button className="btn-secondary" onClick={startEditing} disabled={generating}>
              <Pencil className="size-4" aria-hidden /> Edit
            </button>
          )}
          {strategy && !editing && (
            <button className="btn-secondary" onClick={generate} disabled={generating}>
              {generating ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
              {generating ? 'Preparing…' : 'Regenerate'}
            </button>
          )}
          {editing && (
            <>
              <button className="btn-ghost" onClick={cancelEditing} disabled={saving}>
                <X className="size-4" aria-hidden /> Cancel
              </button>
              <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
                {saving ? <Spinner /> : <Save className="size-4" aria-hidden />}
                Save changes
              </button>
            </>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={editing ? undefined : generate} />}

      {generating && !strategy && <LoadingState label="Preparing your campaign strategy…" />}

      {!strategy && !generating && (
        <EmptyState
          icon={Target}
          title="No strategy yet"
          description="Generate a strategy from your brief. Content you create next will follow it."
          action={
            <button className="btn-primary" onClick={generate}>
              <Lightbulb className="size-4" aria-hidden /> Generate strategy
            </button>
          }
        />
      )}

      {strategy && !editing && (
        <div className={`card space-y-6 p-6 ${generating ? 'opacity-60' : ''}`}>
          <StrategyView strategy={strategy} />
        </div>
      )}

      {editing && draft && (
        <div className="card space-y-5 p-6">
          <StrategyForm draft={draft} onChange={setDraft} />
        </div>
      )}
    </section>
  )
}

function StrategyView({ strategy }: { strategy: Strategy }) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Block label="Positioning" text={strategy.positioning} />
        <Block label="Core message" text={strategy.core_message} />
        <Block label="Target audience" text={strategy.audience_summary} />
        <Block label="Value proposition" text={strategy.value_proposition} />
        <Block label="Recommended tone" text={strategy.recommended_tone} />
      </div>

      <div>
        <Label>Creative concepts</Label>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {strategy.concepts.map((concept, index) => (
            <div key={index} className="rounded-lg border border-line bg-raised p-4">
              <p className="text-sm font-medium text-zinc-100">{concept.name}</p>
              <p className="mt-1 text-sm text-zinc-400">{concept.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Pills label="Content themes" items={strategy.content_themes} />
        <Pills label="Recommended calls to action" items={strategy.calls_to_action} />
      </div>

      {strategy.assumptions.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <Label>Assumptions to check</Label>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/80">
            {strategy.assumptions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function StrategyForm({
  draft,
  onChange,
}: {
  draft: Strategy
  onChange: (strategy: Strategy) => void
}) {
  const text = (key: keyof Strategy, label: string, rows = 2) => (
    <FormField label={label} htmlFor={`strategy-${key}`}>
      <textarea
        id={`strategy-${key}`}
        className="field resize-y"
        rows={rows}
        value={draft[key] as string}
        onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
      />
    </FormField>
  )
  const list = (key: 'content_themes' | 'calls_to_action' | 'assumptions', label: string) => (
    <FormField label={label} htmlFor={`strategy-${key}`} hint="One per line.">
      <textarea
        id={`strategy-${key}`}
        className="field resize-y"
        rows={4}
        defaultValue={lines(draft[key])}
        onChange={(e) => onChange({ ...draft, [key]: parseLines(e.target.value) })}
      />
    </FormField>
  )

  return (
    <>
      {text('positioning', 'Positioning')}
      {text('core_message', 'Core message')}
      {text('audience_summary', 'Target audience')}
      {text('value_proposition', 'Value proposition')}
      {text('recommended_tone', 'Recommended tone', 1)}

      <div className="space-y-3">
        <Label>Creative concepts</Label>
        {draft.concepts.map((concept, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-line bg-raised p-3">
            <input
              aria-label={`Concept ${index + 1} name`}
              className="field"
              value={concept.name}
              onChange={(e) =>
                onChange({
                  ...draft,
                  concepts: draft.concepts.map((c, i) =>
                    i === index ? { ...c, name: e.target.value } : c,
                  ),
                })
              }
            />
            <textarea
              aria-label={`Concept ${index + 1} description`}
              className="field resize-y"
              rows={2}
              value={concept.description}
              onChange={(e) =>
                onChange({
                  ...draft,
                  concepts: draft.concepts.map((c, i) =>
                    i === index ? { ...c, description: e.target.value } : c,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>

      {list('content_themes', 'Content themes')}
      {list('calls_to_action', 'Recommended calls to action')}
      {list('assumptions', 'Assumptions')}
    </>
  )
}

function Label({ children }: { children: string }) {
  return <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{children}</p>
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-sm leading-relaxed text-zinc-200">{text}</p>
    </div>
  )
}

function Pills({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span key={index} className="rounded-full bg-raised px-3 py-1 text-sm text-zinc-300">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
