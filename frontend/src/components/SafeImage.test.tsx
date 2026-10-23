import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafeImage } from './SafeImage'

describe('SafeImage', () => {
  it('shows the image when it loads', () => {
    render(<SafeImage src="/api/images/1/file" alt="Product" />)
    expect(screen.getByRole('img', { name: 'Product' })).toHaveAttribute('src', '/api/images/1/file')
  })

  it('shows a neutral fallback instead of a broken image', () => {
    const { container } = render(
      <SafeImage src="/api/images/9/file" alt="Product" fallbackText="Could not load" />,
    )
    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Product (image unavailable)' })).toHaveTextContent('Could not load')
  })
})
