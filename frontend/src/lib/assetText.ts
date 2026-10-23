import type { Asset, AdCopy, Email, SocialPost, VideoScript } from '../types/asset'

/** Plain-text version of an asset, used by the Copy button. */
export function assetToText(asset: Asset): string {
  switch (asset.content_type) {
    case 'social_post': {
      const c = asset.content as SocialPost
      return [c.headline, c.body, c.call_to_action, c.hashtags.join(' ')]
        .filter(Boolean)
        .join('\n\n')
    }
    case 'ad_copy': {
      const c = asset.content as AdCopy
      return [c.headline, c.primary_text, c.description, c.call_to_action]
        .filter(Boolean)
        .join('\n\n')
    }
    case 'email': {
      const c = asset.content as Email
      return [
        `Subject: ${c.subject}`,
        c.preview_text && `Preview: ${c.preview_text}`,
        c.body,
        c.call_to_action,
      ]
        .filter(Boolean)
        .join('\n\n')
    }
    case 'video_script': {
      const c = asset.content as VideoScript
      const scenes = c.scenes.map(
        (s) =>
          `Scene ${s.order} (${s.duration_seconds}s)\nVisual: ${s.visual}` +
          (s.voiceover ? `\nVoiceover: ${s.voiceover}` : ''),
      )
      return [
        c.concept,
        `Hook: ${c.hook}`,
        ...scenes,
        `Closing call to action: ${c.closing_call_to_action}`,
        `Estimated duration: ${c.estimated_duration_seconds}s`,
      ].join('\n\n')
    }
  }
}
