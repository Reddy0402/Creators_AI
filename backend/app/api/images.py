from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import storage
from app.database import get_db
from app.models import VisualAsset
from app.schemas import GenerateImageRequest, VisualAssetOut, VisualType
from app.services import visual_service
from app.services.image_service import ImageService, get_image_service

router = APIRouter(tags=["images"])


@router.post(
    "/campaigns/{campaign_id}/images",
    response_model=VisualAssetOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    campaign_id: int,
    file: UploadFile = File(...),
    asset_type: VisualType = Form("product_image"),
    title: str = Form("", max_length=120),
    db: Session = Depends(get_db),
):
    # The declared content type and file name are ignored; the bytes are checked instead.
    data = await visual_service.read_limited(file)
    return visual_service.store_image(
        db,
        campaign_id,
        data,
        asset_type=asset_type,
        title=title.strip(),
        source="upload",
    )


@router.get("/campaigns/{campaign_id}/images", response_model=list[VisualAssetOut])
def list_images(campaign_id: int, db: Session = Depends(get_db)):
    return visual_service.list_visuals(db, campaign_id)


@router.post(
    "/campaigns/{campaign_id}/generate-image",
    response_model=VisualAssetOut,
    status_code=status.HTTP_201_CREATED,
)
def generate_image(
    campaign_id: int,
    request: GenerateImageRequest,
    db: Session = Depends(get_db),
    images: ImageService = Depends(get_image_service),
):
    return images.generate(
        db,
        campaign_id,
        asset_type=request.asset_type,
        aspect_ratio=request.aspect_ratio,
        title=request.title.strip(),
        brief=request.brief,
    )


@router.get("/images/{image_id}", response_model=VisualAssetOut)
def get_image(image_id: int, db: Session = Depends(get_db)):
    return visual_service.get_visual(db, image_id)


@router.get("/images/{image_id}/file")
def get_image_file(image_id: int, db: Session = Depends(get_db)):
    visual = visual_service.get_visual(db, image_id)
    path = storage.existing_path(visual.storage_key)
    return FileResponse(
        path,
        media_type=visual.mime_type,
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(image_id: int, db: Session = Depends(get_db)):
    visual_service.delete_visual(db, image_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
