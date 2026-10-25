import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client'

function mockFetch(response: Response | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await expect(request<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true })
  })

  it('returns undefined for 204 responses', async () => {
    mockFetch(new Response(null, { status: 204 }))
    await expect(request<void>('/campaigns/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('uses the backend detail message for errors', async () => {
    mockFetch(
      new Response(JSON.stringify({ detail: 'Generate a campaign strategy before creating content.' }), {
        status: 409,
      }),
    )
    const error = (await request('/campaigns/1/generate-content').catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('Generate a campaign strategy before creating content.')
  })

  it('keeps per-field validation messages', async () => {
    mockFetch(
      new Response(
        JSON.stringify({ detail: "Please check 'name': Field required.", fields: { name: 'Field required' } }),
        { status: 422 },
      ),
    )
    const error = (await request('/campaigns', { method: 'POST' }).catch((e) => e)) as ApiError
    expect(error.fields).toEqual({ name: 'Field required' })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }))
    const error = (await request('/campaigns').catch((e) => e)) as ApiError
    expect(error.message).toBe('Something went wrong (error 502).')
  })

  it('detects proxy connection refused errors when backend is down', async () => {
    mockFetch(new Response('Error: connect ECONNREFUSED 127.0.0.1:8000', { status: 500 }))
    const error = (await request('/campaigns').catch((e) => e)) as ApiError
    expect(error.message).toBe("Can't connect to the backend server. Make sure the backend is running on port 8000.")
  })

  it('explains when the server cannot be reached', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    const error = (await request('/campaigns').catch((e) => e)) as ApiError
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/Can't reach the server/)
  })
})
