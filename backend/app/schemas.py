"""Request and response schemas for the HTTP API."""

from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.ai.output_models import StrategyOut

PLATFORMS = ("Instagram", "LinkedIn", "X", "Facebook", "TikTok", "YouTube", "Email")
Platform = Literal["Instagram", "LinkedIn", "X", "Facebook", "TikTok", "YouTube", "Email"]
ContentType = Literal["social_post", "ad_copy", "video_script", "email"]
AssetStatus = Literal["draft", "approved"]
RefineAction = Literal[
    "shorten",
    "expand",
    "more_professional",
    "more_conversational",
    "improve_hook",
    "strengthen_cta",
    "adapt_platform",
]

Required = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes. We only ever store UTC, so label them as such,
    # otherwise browsers would parse the timestamps as local time.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


UTCDateTime = Annotated[datetime, AfterValidator(_as_utc)]


def _limited(max_length: int):
    return Annotated[str, StringConstraints(strip_whitespace=True, max_length=max_length)]


class CampaignCreate(BaseModel):
    name: Required = Field(max_length=120)
    product_or_service: Required = Field(max_length=200)
    target_audience: Required = Field(max_length=300)
    objective: Required = Field(max_length=300)
    platform: Platform
    tone: Required = Field(max_length=60)
    brief: _limited(4000) = ""


class CampaignUpdate(BaseModel):
    """PATCH body. Only the fields that are sent are changed."""

    name: Required | None = Field(default=None, max_length=120)
    product_or_service: Required | None = Field(default=None, max_length=200)
    target_audience: Required | None = Field(default=None, max_length=300)
    objective: Required | None = Field(default=None, max_length=300)
    platform: Platform | None = None
    tone: Required | None = Field(default=None, max_length=60)
    brief: _limited(4000) | None = None
    # Lets the user save edits to the generated strategy.
    strategy: StrategyOut | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    product_or_service: str
    target_audience: str
    objective: str
    platform: str
    tone: str
    brief: str
    strategy: dict | None
    created_at: UTCDateTime
    updated_at: UTCDateTime


class CampaignSummary(BaseModel):
    """List item: the campaign plus counts, so the dashboard needs no extra queries."""

    id: int
    name: str
    product_or_service: str
    platform: str
    has_strategy: bool
    asset_count: int
    # URL of the campaign's product image (or first visual), or null when it has none.
    thumbnail_url: str | None = None
    created_at: UTCDateTime
    updated_at: UTCDateTime


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    content_type: str
    platform: str
    title: str
    content: dict
    status: str
    source_asset_id: int | None
    created_at: UTCDateTime
    updated_at: UTCDateTime


VisualType = Literal["product_image", "social_post", "ad_creative", "hero_banner", "video_thumbnail"]
AspectRatio = Literal["square", "portrait", "landscape"]


class VisualAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    asset_type: str
    title: str
    source: str
    prompt: str | None
    provider: str | None
    model: str | None
    mime_type: str
    width: int
    height: int
    size_bytes: int
    url: str
    created_at: UTCDateTime


class GenerateImageRequest(BaseModel):
    asset_type: VisualType = "product_image"
    aspect_ratio: AspectRatio = "square"
    title: _limited(120) = ""
    # Optional extra direction, e.g. "morning light on a wooden desk".
    brief: _limited(300) = ""


class AssetUpdate(BaseModel):
    title: Required | None = Field(default=None, max_length=200)
    content: dict | None = None
    status: AssetStatus | None = None


class GenerateContentRequest(BaseModel):
    content_type: ContentType
    platform: Platform
    tone: Required = Field(max_length=60)
    variations: int = Field(default=1, ge=1, le=3)
    instructions: _limited(500) = ""


class RefineRequest(BaseModel):
    action: RefineAction
    target_platform: Platform | None = None
