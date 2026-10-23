from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.output_models import CONTENT_MODELS, asset_title
from app.errors import ConflictError, InvalidContentError, NotFoundError
from app.models import CreativeAsset
from app.schemas import AssetUpdate, GenerateContentRequest, RefineRequest
from app.services import campaign_service
from app.services.ai_service import AIService


def list_assets(db: Session, campaign_id: int) -> list[CreativeAsset]:
    campaign_service.get_campaign(db, campaign_id)  # 404 for unknown campaigns
    return list(
        db.scalars(
            select(CreativeAsset)
            .where(CreativeAsset.campaign_id == campaign_id)
            .order_by(CreativeAsset.created_at.desc(), CreativeAsset.id.desc())
        )
    )


def get_asset(db: Session, asset_id: int) -> CreativeAsset:
    asset = db.get(CreativeAsset, asset_id)
    if asset is None:
        raise NotFoundError("Content not found.")
    return asset


def generate_content(
    db: Session, campaign_id: int, request: GenerateContentRequest, ai: AIService
) -> list[CreativeAsset]:
    """Generate variations from the saved campaign and strategy; save each as its own asset."""
    campaign = campaign_service.get_campaign(db, campaign_id)
    if not campaign.strategy:
        raise ConflictError("Generate a campaign strategy before creating content.")

    items = ai.generate_content(
        campaign,
        request.content_type,
        request.platform,
        request.tone,
        request.variations,
        request.instructions,
    )
    assets = [
        CreativeAsset(
            campaign_id=campaign.id,
            content_type=request.content_type,
            platform=request.platform,
            title=asset_title(request.content_type, item),
            content=item,
        )
        for item in items
    ]
    db.add_all(assets)
    db.commit()
    for asset in assets:
        db.refresh(asset)
    return assets


def update_asset(db: Session, asset_id: int, data: AssetUpdate) -> CreativeAsset:
    asset = get_asset(db, asset_id)
    changes = data.model_dump(exclude_unset=True)

    if changes.get("content") is not None:
        item_model, _ = CONTENT_MODELS[asset.content_type]
        try:
            asset.content = item_model.model_validate(changes["content"]).model_dump()
        except ValidationError as exc:
            raise InvalidContentError(_describe(exc)) from exc
        if changes.get("title") is None:
            asset.title = asset_title(asset.content_type, asset.content)
    if changes.get("title") is not None:
        asset.title = changes["title"]
    if changes.get("status") is not None:
        asset.status = changes["status"]

    db.commit()
    db.refresh(asset)
    return asset


def refine_asset(
    db: Session, asset_id: int, request: RefineRequest, ai: AIService
) -> CreativeAsset:
    """Create a revised copy. The original asset is never modified."""
    original = get_asset(db, asset_id)
    campaign = campaign_service.get_campaign(db, original.campaign_id)
    if request.action == "adapt_platform" and not request.target_platform:
        raise InvalidContentError("Choose a platform to adapt this content to.")
    platform = request.target_platform or original.platform

    content = ai.refine_content(campaign, original, request.action, request.target_platform)
    revised = CreativeAsset(
        campaign_id=original.campaign_id,
        content_type=original.content_type,
        platform=platform,
        title=asset_title(original.content_type, content),
        content=content,
        source_asset_id=original.id,
    )
    db.add(revised)
    db.commit()
    db.refresh(revised)
    return revised


def delete_asset(db: Session, asset_id: int) -> None:
    asset = get_asset(db, asset_id)
    db.delete(asset)
    db.commit()


def _describe(exc: ValidationError) -> str:
    first = exc.errors()[0]
    field = ".".join(str(part) for part in first["loc"])
    return f"Invalid content for '{field}': {first['msg']}."
