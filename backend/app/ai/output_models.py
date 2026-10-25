"""Pydantic models describing what the model must return.

These are the single source of truth for structured output: prompts embed their JSON
shape, the AI service validates responses against them, and the database stores the
validated result.
"""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class _Out(BaseModel):
    # Ignore stray keys a model may add instead of failing the whole generation.
    model_config = ConfigDict(extra="ignore")


# ---- Strategy -------------------------------------------------------------------------


class CreativeConcept(_Out):
    name: Text
    description: Text


class StrategyOut(_Out):
    positioning: Text
    audience_summary: Text
    core_message: Text
    value_proposition: Text
    recommended_tone: Text
    concepts: list[CreativeConcept] = Field(min_length=3, max_length=3)
    content_themes: list[Text] = Field(min_length=1, max_length=8)
    calls_to_action: list[Text] = Field(min_length=1, max_length=6)
    # Anything the model had to assume because the brief didn't say.
    assumptions: list[Text] = Field(default_factory=list, max_length=8)


# ---- Content assets -------------------------------------------------------------------


class SocialPostOut(_Out):
    headline: Text
    body: Text
    call_to_action: Text
    hashtags: list[str] = Field(default_factory=list, max_length=12)


class AdCopyOut(_Out):
    headline: Text
    primary_text: Text
    description: str = ""
    call_to_action: Text


class VideoScene(_Out):
    order: int = Field(ge=1)
    visual: Text
    voiceover: str = ""
    duration_seconds: int = Field(default=5, ge=1, le=120)


class VideoScriptOut(_Out):
    concept: Text
    hook: Text
    scenes: list[VideoScene] = Field(min_length=1, max_length=12)
    closing_call_to_action: Text
    estimated_duration_seconds: int = Field(ge=1, le=300)


class EmailOut(_Out):
    subject: Text
    preview_text: str = ""
    body: Text
    call_to_action: Text


class TaglineOut(_Out):
    tagline: Text
    style: Text
    rationale: str = ""
    keywords: list[str] = Field(default_factory=list, max_length=6)


class SocialPostVariations(_Out):
    variations: list[SocialPostOut] = Field(min_length=1)


class AdCopyVariations(_Out):
    variations: list[AdCopyOut] = Field(min_length=1)


class VideoScriptVariations(_Out):
    variations: list[VideoScriptOut] = Field(min_length=1)


class EmailVariations(_Out):
    variations: list[EmailOut] = Field(min_length=1)


class TaglineVariations(_Out):
    variations: list[TaglineOut] = Field(min_length=1)


# content_type -> (single-asset model, wrapper holding N variations)
CONTENT_MODELS: dict[str, tuple[type[_Out], type[_Out]]] = {
    "social_post": (SocialPostOut, SocialPostVariations),
    "ad_copy": (AdCopyOut, AdCopyVariations),
    "video_script": (VideoScriptOut, VideoScriptVariations),
    "email": (EmailOut, EmailVariations),
    "tagline": (TaglineOut, TaglineVariations),
}

CONTENT_TYPES = tuple(CONTENT_MODELS)


def asset_title(content_type: str, content: dict) -> str:
    """A short human-readable title taken from the asset's own content."""
    key = {
        "social_post": "headline",
        "ad_copy": "headline",
        "video_script": "concept",
        "email": "subject",
        "tagline": "tagline",
    }.get(content_type)
    if key and key in content:
        return str(content[key])[:200]
    return "Untitled"

