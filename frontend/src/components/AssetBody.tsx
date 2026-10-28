import { Plus, Trash2 } from 'lucide-react'
import type {
  AdCopy,
  Asset,
  AssetContent,
  ContentType,
  Email,
  SocialPost,
  Tagline,
  VideoScene,
  VideoScript,
} from '../types/asset'
import { FormField } from './FormField'

// ---- read-only view ---------------------------------------------------------------------

export function AssetView({ asset }: { asset: Asset }) {
  switch (asset.content_type) {
    case 'social_post': {
      const c = asset.content as SocialPost
      return (
        <div className="space-y-3">
          <p className="font-display text-base font-bold text-ink">{c.headline}</p>
          <Prose text={c.body} />
          <Row label="Call to action" text={c.call_to_action} />
          {c.hashtags.length > 0 && <p className="text-sm font-medium text-ink">{c.hashtags.join(' ')}</p>}
        </div>
      )
    }
    case 'ad_copy': {
      const c = asset.content as AdCopy
      return (
        <div className="space-y-3">
          <p className="font-display text-base font-bold text-ink">{c.headline}</p>
          <Prose text={c.primary_text} />
          {c.description && <Row label="Description" text={c.description} />}
          <Row label="Call to action" text={c.call_to_action} />
        </div>
      )
    }
    case 'email': {
      const c = asset.content as Email
      return (
        <div className="space-y-3">
          <Row label="Subject" text={c.subject} />
          {c.preview_text && <Row label="Preview" text={c.preview_text} />}
          <Prose text={c.body} />
          <Row label="Call to action" text={c.call_to_action} />
        </div>
      )
    }
    case 'video_script': {
      const c = asset.content as VideoScript
      return (
        <div className="space-y-4">
          <p className="font-display text-base font-bold text-ink">{c.concept}</p>
          <Row label="Opening hook" text={c.hook} />
          <ol className="space-y-2">
            {c.scenes.map((scene) => (
              <li key={scene.order} className="rounded-none border-2 border-ink bg-canvas p-3 text-sm">
                <p className="text-xs font-bold text-ink-mute">
                  Scene {scene.order} · {scene.duration_seconds}s
                </p>
                <p className="mt-1 text-ink-soft">{scene.visual}</p>
                {scene.voiceover && (
                  <p className="mt-1 text-ink-soft italic">“{scene.voiceover}”</p>
                )}
              </li>
            ))}
          </ol>
          <Row label="Closing call to action" text={c.closing_call_to_action} />
          <p className="text-xs font-medium text-ink-mute">
            Estimated duration: {c.estimated_duration_seconds}s
          </p>
        </div>
      )
    }
    case 'tagline': {
      const c = asset.content as Tagline
      return (
        <div className="space-y-3">
          <blockquote className="border-l-4 border-lime pl-3 text-lg font-semibold tracking-tight text-ink italic">
            “{c.tagline}”
          </blockquote>
          {c.style && <Row label="Style" text={c.style} />}
          {c.rationale && <Prose text={c.rationale} />}
          {c.keywords && c.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {c.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="rounded-none border-2 border-ink bg-canvas px-2.5 py-0.5 text-xs font-medium text-ink"
                >
                  #{kw.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    }
  }
}

function Prose({ text }: { text: string }) {
  return <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{text}</p>
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-sm text-ink-soft">
      <span className="mr-2 text-xs font-bold tracking-wide text-ink-mute uppercase">
        {label}
      </span>
      {text}
    </p>
  )
}

// ---- editor -----------------------------------------------------------------------------

type Draft = Record<string, unknown>

interface FieldSpec {
  key: string
  label: string
  multiline?: boolean
}

const TEXT_FIELDS: Record<Exclude<ContentType, 'video_script'>, FieldSpec[]> = {
  social_post: [
    { key: 'headline', label: 'Headline' },
    { key: 'body', label: 'Body copy', multiline: true },
    { key: 'call_to_action', label: 'Call to action' },
  ],
  ad_copy: [
    { key: 'headline', label: 'Headline' },
    { key: 'primary_text', label: 'Primary text', multiline: true },
    { key: 'description', label: 'Description' },
    { key: 'call_to_action', label: 'Call to action' },
  ],
  email: [
    { key: 'subject', label: 'Subject' },
    { key: 'preview_text', label: 'Preview text' },
    { key: 'body', label: 'Body', multiline: true },
    { key: 'call_to_action', label: 'Call to action' },
  ],
  tagline: [
    { key: 'tagline', label: 'Tagline & Slogan' },
    { key: 'style', label: 'Style classification' },
    { key: 'rationale', label: 'Strategic rationale', multiline: true },
  ],
}

interface EditorProps {
  assetId: number
  type: ContentType
  draft: AssetContent
  onChange: (draft: AssetContent) => void
}

export function AssetEditor({ assetId, type, draft, onChange }: EditorProps) {
  const values = draft as unknown as Draft
  const update = (key: string, value: unknown) =>
    onChange({ ...values, [key]: value } as unknown as AssetContent)
  const id = (key: string) => `asset-${assetId}-${key}`

  const textField = ({ key, label, multiline }: FieldSpec) => (
    <FormField key={key} label={label} htmlFor={id(key)}>
      {multiline ? (
        <textarea
          id={id(key)}
          className="field min-h-28 resize-y"
          value={String(values[key] ?? '')}
          onChange={(e) => update(key, e.target.value)}
        />
      ) : (
        <input
          id={id(key)}
          className="field"
          value={String(values[key] ?? '')}
          onChange={(e) => update(key, e.target.value)}
        />
      )}
    </FormField>
  )

  if (type === 'video_script') {
    const script = draft as VideoScript
    return (
      <div className="space-y-4">
        {textField({ key: 'concept', label: 'Concept' })}
        {textField({ key: 'hook', label: 'Opening hook' })}
        <ScenesEditor
          scenes={script.scenes}
          onChange={(scenes) => update('scenes', scenes)}
        />
        {textField({ key: 'closing_call_to_action', label: 'Closing call to action' })}
        <FormField label="Estimated duration (seconds)" htmlFor={id('duration')}>
          <input
            id={id('duration')}
            type="number"
            min={1}
            className="field w-32"
            value={script.estimated_duration_seconds}
            onChange={(e) => update('estimated_duration_seconds', Number(e.target.value) || 0)}
          />
        </FormField>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {TEXT_FIELDS[type].map(textField)}
      {type === 'social_post' && (
        <FormField label="Hashtags" htmlFor={id('hashtags')} hint="Separate with spaces or commas.">
          <input
            id={id('hashtags')}
            className="field"
            defaultValue={(draft as SocialPost).hashtags.join(' ')}
            onChange={(e) =>
              update(
                'hashtags',
                e.target.value
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
              )
            }
          />
        </FormField>
      )}
    </div>
  )
}

function ScenesEditor({
  scenes,
  onChange,
}: {
  scenes: VideoScene[]
  onChange: (scenes: VideoScene[]) => void
}) {
  const renumber = (list: VideoScene[]) => list.map((s, i) => ({ ...s, order: i + 1 }))
  const patch = (index: number, changes: Partial<VideoScene>) =>
    onChange(scenes.map((s, i) => (i === index ? { ...s, ...changes } : s)))

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-ink">Scenes</legend>
      {scenes.map((scene, index) => (
        <div key={index} className="space-y-2 rounded-none border-2 border-ink bg-canvas p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-mute">Scene {scene.order}</span>
            <button
              type="button"
              className="cursor-pointer text-ink-mute hover:text-error disabled:opacity-40"
              aria-label={`Remove scene ${scene.order}`}
              disabled={scenes.length === 1}
              onClick={() => onChange(renumber(scenes.filter((_, i) => i !== index)))}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
          <textarea
            aria-label={`Scene ${scene.order} visual`}
            placeholder="Visual direction"
            className="field resize-y"
            rows={2}
            value={scene.visual}
            onChange={(e) => patch(index, { visual: e.target.value })}
          />
          <textarea
            aria-label={`Scene ${scene.order} voiceover`}
            placeholder="Voiceover or dialogue"
            className="field resize-y"
            rows={2}
            value={scene.voiceover}
            onChange={(e) => patch(index, { voiceover: e.target.value })}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
            Duration (s)
            <input
              type="number"
              min={1}
              className="field w-24"
              value={scene.duration_seconds}
              onChange={(e) => patch(index, { duration_seconds: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary"
        disabled={scenes.length >= 12}
        onClick={() =>
          onChange([
            ...scenes,
            { order: scenes.length + 1, visual: '', voiceover: '', duration_seconds: 5 },
          ])
        }
      >
        <Plus className="size-4" aria-hidden /> Add scene
      </button>
    </fieldset>
  )
}
