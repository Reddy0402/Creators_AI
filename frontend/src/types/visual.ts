export type VisualType =
  | 'product_image'
  | 'social_post'
  | 'ad_creative'
  | 'hero_banner'
  | 'video_thumbnail'

export const VISUAL_TYPES: { value: VisualType; label: string; hint: string }[] = [
  { value: 'product_image', label: 'Product image', hint: 'A clean photo of the product' },
  { value: 'social_post', label: 'Social post visual', hint: 'A lifestyle image for a feed' },
  { value: 'ad_creative', label: 'Ad creative', hint: 'A bold visual with room for a headline' },
  { value: 'hero_banner', label: 'Campaign hero banner', hint: 'A wide image for a page header' },
  { value: 'video_thumbnail', label: 'Video thumbnail', hint: 'An eye-catching frame for short videos' },
]

export const visualTypeLabel = (type: string) =>
  VISUAL_TYPES.find((t) => t.value === type)?.label ?? type

export type AspectRatio = 'square' | 'portrait' | 'landscape'

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: 'square', label: 'Square (1:1)' },
  { value: 'portrait', label: 'Portrait (4:5)' },
  { value: 'landscape', label: 'Wide banner' },
]

export interface VisualAsset {
  id: number
  campaign_id: number
  asset_type: string
  title: string
  source: 'upload' | 'generated'
  prompt: string | null
  provider: string | null
  model: string | null
  mime_type: string
  width: number
  height: number
  size_bytes: number
  url: string
  created_at: string
}

export interface GenerateImageInput {
  asset_type: VisualType
  aspect_ratio: AspectRatio
  title: string
  brief: string
}
