import type { GenerateImageInput, VisualAsset, VisualType } from '../types/visual'
import { json, request } from './client'

export const visualApi = {
  listForCampaign: (campaignId: number) =>
    request<VisualAsset[]>(`/campaigns/${campaignId}/images`),

  upload: (campaignId: number, file: File, assetType: VisualType, title: string) => {
    // The browser's file type is only a hint; the backend checks the real image bytes.
    const form = new FormData()
    form.append('file', file)
    form.append('asset_type', assetType)
    form.append('title', title)
    return request<VisualAsset>(`/campaigns/${campaignId}/images`, { method: 'POST', body: form })
  },

  generate: (campaignId: number, input: GenerateImageInput) =>
    request<VisualAsset>(`/campaigns/${campaignId}/generate-image`, json('POST', input)),

  remove: (id: number) => request<void>(`/images/${id}`, json('DELETE')),
}
