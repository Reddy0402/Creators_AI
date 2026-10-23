import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import {
  ASPECT_RATIOS,
  VISUAL_TYPES,
  type AspectRatio,
  type GenerateImageInput,
  type VisualType,
} from '../types/visual'
import { ErrorMessage } from './ErrorMessage'
import { FormField } from './FormField'
import { Spinner } from './LoadingState'

interface Props {
  /** null while the setup status is still loading. */
  ready: boolean | null
  generating: boolean
  error: string | null
  onGenerate: (input: GenerateImageInput) => void
}

export function ImageGenerationPanel({ ready, generating, error, onGenerate }: Props) {
  const [assetType, setAssetType] = useState<VisualType>('product_image')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square')
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!generating && ready) {
          onGenerate({ asset_type: assetType, aspect_ratio: aspectRatio, title: title.trim(), brief: brief.trim() })
        }
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" aria-hidden />
        <h3 className="font-medium text-zinc-100">Generate a visual</h3>
      </div>

      {ready === false && (
        <p className="rounded-lg border border-line bg-raised px-3 py-2 text-xs text-zinc-400">
          Image generation isn't set up yet. Add the provider key to <code>backend/.env</code> and
          restart the backend, or upload your own image.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Visual type" htmlFor="visual-type">
          <select
            id="visual-type"
            className="field"
            value={assetType}
            disabled={generating || ready !== true}
            onChange={(event) => setAssetType(event.target.value as VisualType)}
          >
            {VISUAL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Format" htmlFor="visual-aspect">
          <select
            id="visual-aspect"
            className="field"
            value={aspectRatio}
            disabled={generating || ready !== true}
            onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Title" htmlFor="visual-gen-title" hint="Optional. Defaults to the visual type.">
        <input
          id="visual-gen-title"
          className="field"
          value={title}
          maxLength={120}
          disabled={generating || ready !== true}
          onChange={(event) => setTitle(event.target.value)}
        />
      </FormField>

      <FormField
        label="Visual direction"
        htmlFor="visual-brief"
        hint="Optional. For example: morning light on a wooden desk."
      >
        <textarea
          id="visual-brief"
          className="field resize-y"
          rows={2}
          maxLength={300}
          disabled={generating || ready !== true}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </FormField>

      {error && <ErrorMessage message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          Generated images are illustrations. They aren't photos of your product.
        </p>
        <button type="submit" className="btn-primary" disabled={generating || ready !== true}>
          {generating ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
          {generating ? 'Generating… this can take a minute' : 'Generate image'}
        </button>
      </div>
    </form>
  )
}
