import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { CONTENT_TYPES, type ContentType, type GenerateContentInput } from '../types/asset'
import { PLATFORMS, TONES, type Platform } from '../types/campaign'
import { FormField } from './FormField'
import { Spinner } from './LoadingState'

interface Props {
  defaultPlatform: Platform
  defaultTone: string
  generating: boolean
  onGenerate: (input: GenerateContentInput) => void
}

export function GeneratePanel({ defaultPlatform, defaultTone, generating, onGenerate }: Props) {
  const [contentType, setContentType] = useState<ContentType>('social_post')
  const [platform, setPlatform] = useState<Platform>(defaultPlatform)
  const [tone, setTone] = useState(defaultTone)
  const [variations, setVariations] = useState(2)
  const [instructions, setInstructions] = useState('')

  // The campaign's own tone may not be one of the presets; keep it selectable.
  const tones = TONES.includes(tone as (typeof TONES)[number]) ? [...TONES] : [tone, ...TONES]

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!generating) {
          onGenerate({
            content_type: contentType,
            platform,
            tone,
            variations,
            instructions: instructions.trim(),
          })
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Content type" htmlFor="gen-type">
          <select
            id="gen-type"
            className="field"
            value={contentType}
            onChange={(e) => {
              const next = e.target.value as ContentType
              setContentType(next)
              if (next === 'email') setPlatform('Email')
              else if (platform === 'Email') setPlatform(defaultPlatform)
            }}
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Platform" htmlFor="gen-platform">
          <select
            id="gen-platform"
            className="field"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
          >
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Tone" htmlFor="gen-tone">
          <select
            id="gen-tone"
            className="field"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            {tones.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Variations" htmlFor="gen-variations">
          <select
            id="gen-variations"
            className="field"
            value={variations}
            onChange={(e) => setVariations(Number(e.target.value))}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label="Additional instructions"
        htmlFor="gen-instructions"
        hint="Optional. For example: mention the free shipping offer."
      >
        <textarea
          id="gen-instructions"
          className="field resize-y"
          rows={2}
          maxLength={500}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </FormField>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={generating}>
          {generating ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
          {generating ? 'Preparing your content…' : 'Create content'}
        </button>
      </div>
    </form>
  )
}
