export const PLATFORMS = [
  'Instagram',
  'LinkedIn',
  'X',
  'Facebook',
  'TikTok',
  'YouTube',
  'Email',
] as const
export type Platform = (typeof PLATFORMS)[number]

export const TONES = [
  'Friendly',
  'Professional',
  'Playful',
  'Bold',
  'Inspirational',
  'Informative',
  'Luxurious',
] as const

export interface CreativeConcept {
  name: string
  description: string
}

export interface Strategy {
  positioning: string
  audience_summary: string
  core_message: string
  value_proposition: string
  recommended_tone: string
  concepts: CreativeConcept[]
  content_themes: string[]
  calls_to_action: string[]
  assumptions: string[]
}

export interface CampaignInput {
  name: string
  product_or_service: string
  target_audience: string
  objective: string
  platform: Platform
  tone: string
  brief: string
}

export interface Campaign extends CampaignInput {
  id: number
  strategy: Strategy | null
  created_at: string
  updated_at: string
}

export interface CampaignSummary {
  id: number
  name: string
  product_or_service: string
  platform: string
  has_strategy: boolean
  asset_count: number
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}
