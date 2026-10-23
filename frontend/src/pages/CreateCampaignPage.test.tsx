import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { CreateCampaignPage } from './CreateCampaignPage'

// useBlocker (unsaved-changes guard) needs a data router.
function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/campaigns/new', element: <CreateCampaignPage /> },
      { path: '/', element: <p>Dashboard</p> },
    ],
    { initialEntries: ['/campaigns/new'] },
  )
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CreateCampaignPage', () => {
  it('blocks submission and shows field errors when required fields are empty', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Create campaign' }))

    expect(screen.getByText('Give the campaign a name.')).toBeInTheDocument()
    expect(screen.getByText('Describe the product or service.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats whitespace-only input as missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.type(screen.getByLabelText(/Campaign name/), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Create campaign' }))

    expect(screen.getByText('Give the campaign a name.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps what the user typed when the server rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: 'Server says no' }), { status: 500 }),
      ),
    )
    renderPage()

    await userEvent.type(screen.getByLabelText(/Campaign name/), 'Summer launch')
    await userEvent.type(screen.getByLabelText(/Product or service/), 'Tea')
    await userEvent.type(screen.getByLabelText(/Target audience/), 'Students')
    await userEvent.type(screen.getByLabelText(/Campaign objective/), 'Sales')
    await userEvent.click(screen.getByRole('button', { name: 'Create campaign' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Server says no')
    expect(screen.getByLabelText(/Campaign name/)).toHaveValue('Summer launch')
    expect(screen.getByRole('button', { name: 'Create campaign' })).toBeEnabled()
  })

  it('sends a single request even if the button is clicked twice quickly', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ id: 7 }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.type(screen.getByLabelText(/Campaign name/), 'A')
    await userEvent.type(screen.getByLabelText(/Product or service/), 'B')
    await userEvent.type(screen.getByLabelText(/Target audience/), 'C')
    await userEvent.type(screen.getByLabelText(/Campaign objective/), 'D')
    const button = screen.getByRole('button', { name: 'Create campaign' })
    await userEvent.dblClick(button)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
