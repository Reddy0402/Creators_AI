import type { Asset, GenerateContentInput, GenerateTaglinesInput, SaveTaglineInput, Tagline } from '../types/asset'
import type { Campaign, CampaignInput, CampaignSummary, Strategy } from '../types/campaign'
import { json, request } from './client'

export const campaignApi = {
  list: () => request<CampaignSummary[]>('/campaigns'),
  get: (id: number) => request<Campaign>(`/campaigns/${id}`),
  create: (input: CampaignInput) => request<Campaign>('/campaigns', json('POST', input)),
  update: (id: number, changes: Partial<CampaignInput> & { strategy?: Strategy }) =>
    request<Campaign>(`/campaigns/${id}`, json('PATCH', changes)),
  remove: (id: number) => request<void>(`/campaigns/${id}`, json('DELETE')),
  generateStrategy: (id: number) => request<Campaign>(`/campaigns/${id}/strategy`, json('POST')),
  listAssets: (id: number) => request<Asset[]>(`/campaigns/${id}/assets`),
  generateContent: (id: number, input: GenerateContentInput) =>
    request<Asset[]>(`/campaigns/${id}/generate-content`, json('POST', input)),
  generateTaglines: (id: number, input: GenerateTaglinesInput) =>
    request<Tagline[]>(`/campaigns/${id}/generate-taglines`, json('POST', input)),
  saveTagline: (id: number, input: SaveTaglineInput) =>
    request<Asset>(`/campaigns/${id}/taglines`, json('POST', input)),
}

