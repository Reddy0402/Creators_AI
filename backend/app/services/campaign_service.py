from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import storage
from app.errors import NotFoundError
from app.models import Campaign, CreativeAsset, VisualAsset
from app.schemas import CampaignCreate, CampaignSummary, CampaignUpdate
from app.services.ai_service import AIService


def create_campaign(db: Session, data: CampaignCreate) -> Campaign:
    campaign = Campaign(**data.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def get_campaign(db: Session, campaign_id: int) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise NotFoundError("Campaign not found.")
    return campaign


def list_campaigns(db: Session) -> list[CampaignSummary]:
    asset_counts = (
        select(CreativeAsset.campaign_id, func.count().label("n"))
        .group_by(CreativeAsset.campaign_id)
        .subquery()
    )
    # Thumbnail: the oldest product image, falling back to the oldest visual of any type.
    thumbnail_ids = (
        select(VisualAsset.campaign_id, func.min(VisualAsset.id).label("visual_id"))
        .group_by(VisualAsset.campaign_id)
        .subquery()
    )
    rows = db.execute(
        select(Campaign, func.coalesce(asset_counts.c.n, 0), thumbnail_ids.c.visual_id)
        .outerjoin(asset_counts, asset_counts.c.campaign_id == Campaign.id)
        .outerjoin(thumbnail_ids, thumbnail_ids.c.campaign_id == Campaign.id)
        .order_by(Campaign.updated_at.desc(), Campaign.id.desc())
    ).all()
    return [
        CampaignSummary(
            id=c.id,
            name=c.name,
            product_or_service=c.product_or_service,
            platform=c.platform,
            has_strategy=c.strategy is not None,
            asset_count=count,
            thumbnail_url=f"/api/images/{visual_id}/file" if visual_id else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c, count, visual_id in rows
    ]


def update_campaign(db: Session, campaign_id: int, data: CampaignUpdate) -> Campaign:
    campaign = get_campaign(db, campaign_id)
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if value is None:
            continue  # required columns are never cleared by PATCH
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)
    return campaign


def delete_campaign(db: Session, campaign_id: int) -> None:
    campaign = get_campaign(db, campaign_id)
    image_keys = [visual.storage_key for visual in campaign.visuals]
    db.delete(campaign)
    db.commit()
    for key in image_keys:  # files go after the rows, so a failed delete leaves both intact
        storage.remove(key)


def generate_strategy(db: Session, campaign_id: int, ai: AIService) -> Campaign:
    """Generate a strategy from the saved campaign. A failure leaves any existing strategy intact."""
    campaign = get_campaign(db, campaign_id)
    campaign.strategy = ai.generate_strategy(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign
