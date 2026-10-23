import { ImageOff } from 'lucide-react'
import { useState } from 'react'

interface Props {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  /** Shown instead of a broken-image icon when the file can't be loaded. */
  fallbackText?: string
}

/** An <img> that shows a neutral placeholder instead of a broken-image icon. */
export function SafeImage({ src, alt, className = '', loading = 'lazy', fallbackText }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image unavailable)`}
        className={`flex size-full flex-col items-center justify-center gap-2 bg-raised px-4 text-center text-xs text-zinc-500 ${className}`}
      >
        <ImageOff className="size-6" aria-hidden />
        <span>{fallbackText ?? 'Image unavailable'}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
