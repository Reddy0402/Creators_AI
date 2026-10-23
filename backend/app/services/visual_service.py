"""Validated image storage shared by uploads and generated images."""

import uuid
from io import BytesIO

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.errors import InvalidContentError, NotFoundError, PayloadTooLargeError, UnsupportedMediaError
from app.models import VisualAsset
from app.services import campaign_service

# Pillow format name -> (mime type, file extension)
FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}

# Stops a small file that decodes to a huge bitmap from using all memory.
MAX_PIXELS = 40_000_000
_CHUNK = 64 * 1024

DEFAULT_TITLES = {
    "product_image": "Product image",
    "social_post": "Social post visual",
    "ad_creative": "Ad creative",
    "hero_banner": "Campaign hero banner",
    "video_thumbnail": "Video thumbnail",
}


async def read_limited(upload: UploadFile) -> bytes:
    """Read the upload, stopping as soon as it exceeds the configured size."""
    limit = get_settings().max_upload_mb * 1024 * 1024
    buffer = bytearray()
    while chunk := await upload.read(_CHUNK):
        buffer.extend(chunk)
        if len(buffer) > limit:
            raise PayloadTooLargeError(f"Images must be {get_settings().max_upload_mb} MB or smaller.")
    if not buffer:
        raise InvalidContentError("The file is empty.")
    return bytes(buffer)


def inspect_image(data: bytes) -> tuple[str, int, int]:
    """Check the actual bytes (not the file name or declared type) and return (format, width, height)."""
    try:
        with Image.open(BytesIO(data)) as probe:
            probe.verify()
        with Image.open(BytesIO(data)) as image:
            fmt, (width, height) = image.format, image.size
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError) as exc:
        raise InvalidContentError("That file isn't a valid image.") from exc

    if fmt not in FORMATS:
        raise UnsupportedMediaError("Only JPEG, PNG and WebP images are supported.")
    if width * height > MAX_PIXELS:
        raise InvalidContentError("That image is too large in pixel dimensions.")
    return fmt, width, height


def store_image(
    db: Session,
    campaign_id: int,
    data: bytes,
    *,
    asset_type: str,
    title: str,
    source: str,
    prompt: str | None = None,
    provider: str | None = None,
    model: str | None = None,
) -> VisualAsset:
    campaign_service.get_campaign(db, campaign_id)
    fmt, width, height = inspect_image(data)
    mime_type, extension = FORMATS[fmt]
    storage_key = f"{uuid.uuid4().hex}.{extension}"

    storage.write(storage_key, data)
    try:
        asset = VisualAsset(
            campaign_id=campaign_id,
            asset_type=asset_type,
            title=(title or DEFAULT_TITLES[asset_type])[:200],
            source=source,
            prompt=prompt,
            provider=provider,
            model=model,
            storage_key=storage_key,
            mime_type=mime_type,
            width=width,
            height=height,
            size_bytes=len(data),
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
    except Exception:
        db.rollback()
        storage.remove(storage_key)  # don't leave an orphaned file behind
        raise
    return asset


def list_visuals(db: Session, campaign_id: int) -> list[VisualAsset]:
    campaign_service.get_campaign(db, campaign_id)
    return list(
        db.scalars(
            select(VisualAsset)
            .where(VisualAsset.campaign_id == campaign_id)
            .order_by(VisualAsset.created_at.desc(), VisualAsset.id.desc())
        )
    )


def get_visual(db: Session, visual_id: int) -> VisualAsset:
    visual = db.get(VisualAsset, visual_id)
    if visual is None:
        raise NotFoundError("Image not found.")
    return visual


def delete_visual(db: Session, visual_id: int) -> None:
    visual = get_visual(db, visual_id)
    storage_key = visual.storage_key
    db.delete(visual)
    db.commit()
    storage.remove(storage_key)
