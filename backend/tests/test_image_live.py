"""Manual check against the real image provider. Uses a small amount of credit.

Run with:  .venv/Scripts/python -m pytest -m live -s tests/test_image_live.py
Requires the key for the active IMAGE_PROVIDER (HF_TOKEN or IMAGE_API_KEY) in backend/.env.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import storage
from app.config import Settings
from app.database import Base
from app.models import Campaign
from app.services.image_service import ImageService

pytestmark = pytest.mark.live


def test_real_generation_is_saved_and_valid(tmp_path, monkeypatch):
    settings = Settings()
    key = settings.hf_token if settings.image_provider == "huggingface" else settings.image_api_key
    if not key.strip():
        pytest.skip("The active image provider has no key configured")

    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    from app.config import get_settings

    get_settings.cache_clear()
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    from app import models  # noqa: F401

    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    campaign = Campaign(
        name="Live check",
        product_or_service="Reusable steel water bottle",
        target_audience="Fitness-conscious customers",
        objective="Drive pre-orders",
        platform="Instagram",
        tone="Premium",
        brief="",
    )
    db.add(campaign)
    db.commit()

    visual = ImageService(settings).generate(
        db,
        campaign.id,
        asset_type="product_image",
        aspect_ratio="square",
        title="",
        brief="natural light in a gym",
    )
    print("\nstored:", visual.width, "x", visual.height, visual.mime_type, visual.size_bytes, "bytes")
    assert visual.source == "generated"
    assert visual.width == 1024 and visual.height == 1024
    assert storage.existing_path(visual.storage_key).is_file()

    db.close()
    engine.dispose()
    get_settings.cache_clear()
