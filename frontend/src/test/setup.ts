import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library's automatic cleanup doesn't run.
afterEach(() => {
  cleanup()
})
