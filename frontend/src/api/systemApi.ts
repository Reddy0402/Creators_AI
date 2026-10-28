import { request } from './client'

export interface HealthStatus {
  status: string
  /** False when the backend cannot reach its database — the dashboard shows a banner then. */
  db_ok?: boolean
  database?: string
  ai_configured: boolean
  image_configured: boolean
}

export const systemApi = {
  health: () => request<HealthStatus>('/health'),
}
