import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.database import Base, get_db
from app.main import app
from app.services import ai_service
from app.services.ai_service import AIService, get_ai_service

CAMPAIGN = {
    "name": "Summer Launch",
    "product_or_service": "Reusable steel water bottle",
    "target_audience": "Urban commuters aged 22-35",
    "objective": "Drive pre-orders",
    "platform": "Instagram",
    "tone": "Friendly",
    "brief": "Keeps drinks cold for 24 hours. Made from recycled steel.",
}

STRATEGY = {
    "positioning": "The bottle that keeps up with your commute.",
    "audience_summary": "Busy urban commuters who care about sustainability.",
    "core_message": "Stay cold, stay sustainable.",
    "value_proposition": "Keeps drinks cold for 24 hours, made from recycled steel.",
    "recommended_tone": "Friendly and upbeat",
    "concepts": [
        {"name": "Commute Companion", "description": "Show the bottle through a day."},
        {"name": "Recycled Pride", "description": "Spotlight the recycled steel."},
        {"name": "24-Hour Cold", "description": "Prove the cold claim visually."},
    ],
    "content_themes": ["Commute life", "Sustainability"],
    "calls_to_action": ["Pre-order today"],
    "assumptions": ["[PLACEHOLDER: launch date]"],
}

SOCIAL = {
    "headline": "Cold all day, zero waste",
    "body": "Meet the bottle built for your commute.",
    "call_to_action": "Pre-order now",
    "hashtags": ["#reusable", "#commute"],
}


def social_variations(n: int = 1) -> str:
    return json.dumps({"variations": [{**SOCIAL, "headline": f"{SOCIAL['headline']} {i}"} for i in range(n)]})


class FakeClient:
    """Stands in for groq.Groq. Each call pops the next reply; Exceptions are raised."""

    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(completions=self)

    def create(self, **kwargs):
        self.calls.append(kwargs)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        text = reply if isinstance(reply, str) else json.dumps(reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=text))])


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(ai_service, "_sleep", lambda _seconds: None)


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    from app import models  # noqa: F401

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def client(session_factory):
    def override_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def use_ai(client):
    """use_ai(*replies) wires a fake Groq client into the app and returns it for inspection."""

    def _use(*replies, **settings):
        fake = FakeClient(*replies)
        cfg = Settings(_env_file=None, groq_api_key="test-key", **settings)
        app.dependency_overrides[get_ai_service] = lambda: AIService(cfg, fake)
        return fake

    return _use


@pytest.fixture
def campaign(client):
    return client.post("/api/campaigns", json=CAMPAIGN).json()


@pytest.fixture
def campaign_with_strategy(client, use_ai, campaign):
    use_ai(STRATEGY)
    return client.post(f"/api/campaigns/{campaign['id']}/strategy").json()
