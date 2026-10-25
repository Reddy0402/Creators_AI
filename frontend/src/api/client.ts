const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  status: number
  /** Per-field validation messages from the backend, when it sent any. */
  fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // FormData (file uploads) sets its own multipart header; everything else is JSON.
      headers:
        init.body === undefined || typeof init.body === 'string'
          ? { 'Content-Type': 'application/json', ...init.headers }
          : init.headers,
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.")
  }

  if (!response.ok) {
    let message = `Something went wrong (error ${response.status}).`
    let fields: Record<string, string> = {}
    try {
      const text = await response.text()
      try {
        const body = JSON.parse(text)
        if (typeof body.detail === 'string') message = body.detail
        else if (typeof body.message === 'string') message = body.message
        if (body.fields && typeof body.fields === 'object') fields = body.fields
      } catch {
        // Body was not JSON. Check for dev server proxy connection errors.
        if (text.includes('ECONNREFUSED') || text.includes('proxy error')) {
          message = "Can't connect to the backend server. Make sure the backend is running on port 8000."
        }
      }
    } catch {
      // The body wasn't readable; keep the generic message.
    }
    throw new ApiError(response.status, message, fields)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})
