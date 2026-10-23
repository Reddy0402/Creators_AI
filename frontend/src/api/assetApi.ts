import type { Asset, AssetContent, RefineAction } from '../types/asset'
import type { Platform } from '../types/campaign'
import { json, request } from './client'

export const assetApi = {
  update: (id: number, changes: { content?: AssetContent; status?: Asset['status'] }) =>
    request<Asset>(`/assets/${id}`, json('PATCH', changes)),
  remove: (id: number) => request<void>(`/assets/${id}`, json('DELETE')),
  refine: (id: number, action: RefineAction, targetPlatform?: Platform) =>
    request<Asset>(
      `/assets/${id}/refine`,
      json('POST', { action, target_platform: targetPlatform }),
    ),
}
