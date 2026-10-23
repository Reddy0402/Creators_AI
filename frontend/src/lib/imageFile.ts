/** Keep in step with MAX_UPLOAD_MB in backend/app/config.py. The backend enforces the limit too. */
export const MAX_UPLOAD_MB = 5

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Returns a message for the user, or null when the file can be uploaded. */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPEG, PNG or WebP image.'
  }
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Images must be ${MAX_UPLOAD_MB} MB or smaller.`
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
