"""Image prompt builder. Built from the saved campaign, so each visual reflects its own brief."""

from app.models import Campaign

# aspect ratio name -> (width, height) in pixels
ASPECT_SIZES = {
    "square": (1024, 1024),
    "portrait": (896, 1120),
    "landscape": (1344, 768),
}

ASPECT_LABELS = {
    "square": "1:1 square",
    "portrait": "4:5 portrait",
    "landscape": "wide landscape banner",
}

VISUAL_DIRECTIONS = {
    "product_image": "a clean product photograph of the product on a simple, uncluttered background",
    "social_post": "an eye-catching lifestyle image suited to a social media feed",
    "ad_creative": "a bold advertising visual with one clear focal subject and room for a headline",
    "hero_banner": "a wide cinematic scene with generous empty space for headline text",
    "video_thumbnail": "a high-contrast, expressive frame with one clear subject",
}

MAX_PROMPT_CHARS = 1000


def build_image_prompt(campaign: Campaign, asset_type: str, aspect_ratio: str, brief: str) -> str:
    parts = [
        f"Create {VISUAL_DIRECTIONS[asset_type]} for a marketing campaign.",
        f"Product or service: {campaign.product_or_service}.",
        f"Target audience: {campaign.target_audience}.",
        f"Campaign objective: {campaign.objective}.",
        f"Brand tone and mood: {campaign.tone}.",
        f"Intended platform: {campaign.platform}. Format: {ASPECT_LABELS[aspect_ratio]}.",
    ]
    if brief.strip():
        parts.append(f"Additional visual direction: {brief.strip()}.")
    parts.append(
        "Professional commercial lighting, clean composition, realistic colours. "
        "No logos, watermarks, brand names or readable text."
    )
    return " ".join(parts)[:MAX_PROMPT_CHARS]
