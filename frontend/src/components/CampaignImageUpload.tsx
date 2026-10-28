import { AlertCircle, ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { formatFileSize, validateImageFile } from '../lib/imageFile'

interface Props {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  id?: string
}

/** Picks one image file (drag-and-drop or file picker) and previews it. Nothing is uploaded here. */
export function CampaignImageUpload({ file, onChange, disabled = false, id = 'image-upload' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function choose(candidate: File | undefined) {
    if (!candidate) return
    const problem = validateImageFile(candidate)
    setError(problem)
    if (!problem) onChange(candidate)
  }

  function clear() {
    setError(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) choose(event.dataTransfer.files[0])
  }

  if (file && previewUrl) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-none border-2 border-ink bg-canvas shadow-brut-xs">
          <img
            src={previewUrl}
            alt={`Preview of ${file.name}`}
            className="max-h-72 w-full object-contain"
          />
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="Remove selected image"
            className="absolute top-2 right-2 flex size-9 cursor-pointer items-center justify-center rounded-none border-2 border-ink bg-surface text-ink shadow-brut-xs transition-colors hover:bg-coral-soft disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs font-medium text-ink-mute">
          {file.name} · {formatFileSize(file.size)}
        </p>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-error">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        aria-dropeffect={!disabled ? 'copy' : undefined}
        className={`flex flex-col items-center gap-3 rounded-none border-2 border-dashed px-4 py-6 text-center transition-colors sm:py-10 ${
          dragging
            ? 'border-ink bg-lime-soft shadow-brut-sm'
            : 'border-ink/50 bg-canvas'
        }`}
      >
        <span
          className={`flex size-12 items-center justify-center rounded-none border-2 border-ink shadow-brut-xs ${
            dragging ? 'bg-lime text-ink' : 'bg-surface text-ink-soft'
          }`}
        >
          <ImagePlus className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-ink">{dragging ? 'Drop it here' : 'Drag an image here, or'}</p>
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
        </button>
        <p className="text-xs text-ink-mute">JPEG, PNG or WebP · up to 5 MB</p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose an image file"
          disabled={disabled}
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-error">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
