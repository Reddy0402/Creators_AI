import { ImagePlus, X } from 'lucide-react'
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
        <div className="relative overflow-hidden rounded-lg border border-line bg-raised">
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
            className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          {file.name} · {formatFileSize(file.size)}
        </p>
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
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
        className={`flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? 'border-accent bg-accent/10' : 'border-line bg-canvas'
        }`}
      >
        <ImagePlus className="size-6 text-zinc-500" aria-hidden />
        <p className="text-sm text-zinc-300">Drag an image here, or</p>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
        </button>
        <p className="text-xs text-zinc-500">JPEG, PNG or WebP · up to 5 MB</p>
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
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
