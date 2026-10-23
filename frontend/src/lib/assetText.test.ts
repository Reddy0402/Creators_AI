import { describe, expect, it } from 'vitest'
import type { Asset } from '../types/asset'
import { assetToText } from './assetText'

const base = {
  id: 1,
  campaign_id: 1,
  platform: 'Instagram',
  title: 't',
  status: 'draft' as const,
  source_asset_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('assetToText', () => {
  it('joins social post parts and hashtags in order', () => {
    const asset: Asset = {
      ...base,
      content_type: 'social_post',
      content: {
        headline: 'Stay cold',
        body: 'All day.',
        call_to_action: 'Shop now',
        hashtags: ['#cold', '#tea'],
      },
    }
    expect(assetToText(asset)).toBe('Stay cold\n\nAll day.\n\nShop now\n\n#cold #tea')
  })

  it('leaves out empty optional fields', () => {
    const asset: Asset = {
      ...base,
      content_type: 'ad_copy',
      content: { headline: 'H', primary_text: 'P', description: '', call_to_action: 'C' },
    }
    expect(assetToText(asset)).toBe('H\n\nP\n\nC')
  })

  it('includes subject and preview for emails', () => {
    const asset: Asset = {
      ...base,
      content_type: 'email',
      content: { subject: 'Hello', preview_text: 'Sneak peek', body: 'Body', call_to_action: 'Go' },
    }
    expect(assetToText(asset)).toBe('Subject: Hello\n\nPreview: Sneak peek\n\nBody\n\nGo')
  })

  it('writes each scene with its duration and voiceover', () => {
    const asset: Asset = {
      ...base,
      content_type: 'video_script',
      content: {
        concept: 'Morning',
        hook: 'Still cold at noon',
        scenes: [
          { order: 1, visual: 'Desk', voiceover: 'Start here', duration_seconds: 4 },
          { order: 2, visual: 'Park', voiceover: '', duration_seconds: 6 },
        ],
        closing_call_to_action: 'Try it',
        estimated_duration_seconds: 10,
      },
    }
    const text = assetToText(asset)
    expect(text).toContain('Scene 1 (4s)\nVisual: Desk\nVoiceover: Start here')
    expect(text).toContain('Scene 2 (6s)\nVisual: Park')
    expect(text).not.toContain('Scene 2 (6s)\nVisual: Park\nVoiceover')
    expect(text).toContain('Estimated duration: 10s')
  })
})
