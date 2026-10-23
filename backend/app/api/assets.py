from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AssetOut, AssetUpdate, RefineRequest
from app.services import content_service
from app.services.ai_service import AIService, get_ai_service

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    return content_service.get_asset(db, asset_id)


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: int, data: AssetUpdate, db: Session = Depends(get_db)):
    return content_service.update_asset(db, asset_id, data)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    content_service.delete_asset(db, asset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{asset_id}/refine", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def refine_asset(
    asset_id: int,
    request: RefineRequest,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    return content_service.refine_asset(db, asset_id, request, ai)
