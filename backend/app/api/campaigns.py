from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AssetOut,
    CampaignCreate,
    CampaignOut,
    CampaignSummary,
    CampaignUpdate,
    GenerateContentRequest,
)
from app.services import campaign_service, content_service
from app.services.ai_service import AIService, get_ai_service

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=list[CampaignSummary])
def list_campaigns(db: Session = Depends(get_db)):
    return campaign_service.list_campaigns(db)


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    return campaign_service.create_campaign(db, data)


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    return campaign_service.get_campaign(db, campaign_id)


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, data: CampaignUpdate, db: Session = Depends(get_db)):
    return campaign_service.update_campaign(db, campaign_id, data)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign_service.delete_campaign(db, campaign_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{campaign_id}/strategy", response_model=CampaignOut)
def generate_strategy(
    campaign_id: int,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    return campaign_service.generate_strategy(db, campaign_id, ai)


@router.get("/{campaign_id}/assets", response_model=list[AssetOut])
def list_assets(campaign_id: int, db: Session = Depends(get_db)):
    return content_service.list_assets(db, campaign_id)


@router.post(
    "/{campaign_id}/generate-content",
    response_model=list[AssetOut],
    status_code=status.HTTP_201_CREATED,
)
def generate_content(
    campaign_id: int,
    request: GenerateContentRequest,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    return content_service.generate_content(db, campaign_id, request, ai)
