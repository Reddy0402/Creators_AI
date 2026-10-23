import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_MB, formatFileSize, validateImageFile } from './imageFile'

const file = (type: string, size = 1024) => new File([new Uint8Array(size)], 'x', { type })

describe('validateImageFile', () => {
  it('accepts JPEG, PNG and WebP', () => {
    expect(validateImageFile(file('image/jpeg'))).toBeNull()
    expect(validateImageFile(file('image/png'))).toBeNull()
    expect(validateImageFile(file('image/webp'))).toBeNull()
  })

  it('rejects other types', () => {
    expect(validateImageFile(file('image/gif'))).toBe('Choose a JPEG, PNG or WebP image.')
    expect(validateImageFile(file('application/pdf'))).toBe('Choose a JPEG, PNG or WebP image.')
  })

  it('rejects empty files', () => {
    expect(validateImageFile(file('image/png', 0))).toBe('That file is empty.')
  })

  it('rejects files over the size limit', () => {
    const tooBig = file('image/png', MAX_UPLOAD_MB * 1024 * 1024 + 1)
    expect(validateImageFile(tooBig)).toBe(`Images must be ${MAX_UPLOAD_MB} MB or smaller.`)
    expect(validateImageFile(file('image/png', MAX_UPLOAD_MB * 1024 * 1024))).toBeNull()
  })
})

describe('formatFileSize', () => {
  it('uses bytes, KB and MB', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
