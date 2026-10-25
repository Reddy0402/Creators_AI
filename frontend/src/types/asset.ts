import type { Platform } from './campaign'

export type ContentType = 'social_post' | 'ad_copy' | 'video_script' | 'email' | 'tagline'

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'social_post', label: 'Social post' },
  { value: 'ad_copy', label: 'Ad copy' },
  { value: 'video_script', label: 'Video script' },
  { value: 'email', label: 'Email' },
  { value: 'tagline', label: 'Tagline & slogan' },
]

export const contentTypeLabel = (type: string) =>
  CONTENT_TYPES.find((t) => t.value === type)?.label ?? type

export interface SocialPost {
  headline: string
  body: string
  call_to_action: string
  hashtags: string[]
}

export interface AdCopy {
  headline: string
  primary_text: string
  description: string
  call_to_action: string
}

export interface VideoScene {
  order: number
  visual: string
  voiceover: string
  duration_seconds: number
}

export interface VideoScript {
  concept: string
  hook: string
  scenes: VideoScene[]
  closing_call_to_action: string
  estimated_duration_seconds: number
}

export interface Email {
  subject: string
  preview_text: string
  body: string
  call_to_action: string
}

export interface Tagline {
  tagline: string
  style: string
  rationale?: string
  keywords?: string[]
}

export const TAGLINE_STYLES = [
  'All Styles',
  'Catchy & Punchy',
  'Minimalist & Modern',
  'Emotional & Inspiring',
  'Benefit-Driven',
  'Playful & Clever',
] as const

export type TaglineStyle = (typeof TAGLINE_STYLES)[number]

export interface GenerateTaglinesInput {
  company_name?: string
  industry?: string
  differentiator?: string
  style?: string
  count?: number
}

export interface SaveTaglineInput {
  tagline: string
  style?: string
  rationale?: string
  keywords?: string[]
}

export type AssetContent = SocialPost | AdCopy | VideoScript | Email | Tagline

export interface Asset {
  id: number
  campaign_id: number
  content_type: ContentType
  platform: string
  title: string
  content: AssetContent
  status: 'draft' | 'approved'
  source_asset_id: number | null
  created_at: string
  updated_at: string
}

export interface GenerateContentInput {
  content_type: ContentType
  platform: Platform
  tone: string
  variations: number
  instructions: string
}

export type RefineAction =
  | 'shorten'
  | 'expand'
  | 'more_professional'
  | 'more_conversational'
  | 'improve_hook'
  | 'strengthen_cta'
  | 'adapt_platform'

export const REFINE_ACTIONS: { value: RefineAction; label: string }[] = [
  { value: 'shorten', label: 'Shorten' },
  { value: 'expand', label: 'Expand' },
  { value: 'more_professional', label: 'Make more professional' },
  { value: 'more_conversational', label: 'Make more conversational' },
  { value: 'improve_hook', label: 'Improve the opening hook' },
  { value: 'strengthen_cta', label: 'Strengthen the call to action' },
  { value: 'adapt_platform', label: 'Adapt to another platform' },
]
