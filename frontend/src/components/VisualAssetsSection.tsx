import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { visualApi } from '../api/visualApi'
import { errorMessage } from '../lib/format'
import {
  VISUAL_TYPES,
  type GenerateImageInput,
  type VisualAsset,
  type VisualType,
} from '../types/visual'
import { CampaignImageUpload } from './CampaignImageUpload'
import { ErrorMessage } from './ErrorMessage'
import { FormField } from './FormField'
import { ImagePreviewDialog } from './ImagePreviewDialog'
import { ImageGenerationPanel } from './ImageGenerationPanel'
import { Spinner } from './LoadingState'
import { VisualAssetGallery } from './VisualAssetGallery'

interface Props {
  campaignId: number
  visuals: VisualAsset[]
  onChange: Dispatch<SetStateAction<VisualAsset[]>>
  imageReady: boolean | null
  onNotify: (message: string) => void
}

export function VisualAssetsSection({ campaignId, visuals, onChange, imageReady, onNotify }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [assetType, setAssetType] = useState<VisualType>('product_image')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [previewing, setPreviewing] = useState<VisualAsset | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Refs block a second click before React has re-rendered the disabled state.
  const uploadInFlight = useRef(false)
  const generateInFlight = useRef(false)
  const deleteInFlight = useRef(false)

  async function upload() {
    if (!file || uploadInFlight.current) return
    uploadInFlight.current = true
    setUploading(true)
    setUploadError(null)
    try {
      const created = await visualApi.upload(campaignId, file, assetType, title.trim())
      onChange((current) => [created, ...current])
      setFile(null)
      setTitle('')
      onNotify('Image saved')
    } catch (err) {
      setUploadError(errorMessage(err)) // the selected file stays so the user can retry
    } finally {
      uploadInFlight.current = false
      setUploading(false)
    }
  }

  async function generate(input: GenerateImageInput) {
    if (generateInFlight.current) return
    generateInFlight.current = true
    setGenerating(true)
    setGenerateError(null)
    try {
      const created = await visualApi.generate(campaignId, input)
      onChange((current) => [created, ...current])
      onNotify('Image generated')
    } catch (err) {
      setGenerateError(errorMessage(err)) // nothing is saved when generation fails
    } finally {
      generateInFlight.current = false
      setGenerating(false)
    }
  }

  async function remove(visual: VisualAsset) {
    if (deleteInFlight.current) return
    if (!window.confirm(`Delete “${visual.title}”? This can’t be undone.`)) return
    deleteInFlight.current = true
    setDeletingId(visual.id)
    setActionError(null)
    try {
      await visualApi.remove(visual.id)
      onChange((current) => current.filter((item) => item.id !== visual.id))
      setPreviewing((current) => (current?.id === visual.id ? null : current))
      onNotify('Image deleted')
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      deleteInFlight.current = false
      setDeletingId(null)
    }
  }

  return (
    <section aria-labelledby="visuals-heading" className="space-y-4">
      <div>
        <h2 id="visuals-heading" className="font-display text-lg font-bold text-ink">
          Visual assets
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Product photos, banners and visuals for this campaign.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <h3 className="font-display text-base font-bold text-ink">Upload an image</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Image type" htmlFor="upload-type">
              <select
                id="upload-type"
                className="field"
                value={assetType}
                disabled={uploading}
                onChange={(event) => setAssetType(event.target.value as VisualType)}
              >
                {VISUAL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Title" htmlFor="upload-title" hint="Optional.">
              <input
                id="upload-title"
                className="field"
                value={title}
                maxLength={120}
                disabled={uploading}
                onChange={(event) => setTitle(event.target.value)}
              />
            </FormField>
          </div>

          <CampaignImageUpload file={file} onChange={setFile} disabled={uploading} id="visual-upload" />

          {uploadError && <ErrorMessage message={uploadError} />}

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={upload} disabled={!file || uploading}>
              {uploading && <Spinner />}
              {uploading ? 'Uploading…' : 'Save image'}
            </button>
          </div>
        </div>

        <ImageGenerationPanel
          ready={imageReady}
          generating={generating}
          error={generateError}
          onGenerate={generate}
        />
      </div>

      {actionError && <ErrorMessage message={actionError} />}

      <VisualAssetGallery
        visuals={visuals}
        onView={setPreviewing}
        onDelete={remove}
        deletingId={deletingId}
      />

      <ImagePreviewDialog visual={previewing} onClose={() => setPreviewing(null)} />
    </section>
  )
}
