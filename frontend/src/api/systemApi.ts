import { request } from './client'

export interface HealthStatus {
  status: string
  ai_configured: boolean
  image_configured: boolean
}

export const systemApi = {
  health: () => request<HealthStatus>('/health'),
}
