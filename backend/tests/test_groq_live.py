"""Manual integration check against the real Groq API. Consumes a small amount of quota.

Run with:  .venv/Scripts/python -m pytest -m live -s
Requires GROQ_API_KEY in backend/.env (or the environment).
"""

import pytest

from app.config import Settings
from app.models import Campaign
from app.services.ai_service import AIService

pytestmark = pytest.mark.live


@pytest.fixture(scope="module")
def ai():
    settings = Settings()
    if not settings.groq_api_key.strip():
        pytest.skip("GROQ_API_KEY is not configured")
    return AIService(settings)


@pytest.fixture(scope="module")
def campaign():
    return Campaign(
        name="Summer Launch",
        product_or_service="Reusable steel water bottle",
        target_audience="Urban commuters aged 22-35",
        objective="Drive pre-orders",
        platform="Instagram",
        tone="Friendly",
        brief="Keeps drinks cold for 24 hours. Made from recycled steel.",
    )


def test_real_strategy_and_content(ai, campaign):
    strategy = ai.generate_strategy(campaign)
    assert len(strategy["concepts"]) == 3
    assert strategy["core_message"]
    print("\ncore message:", ascii(strategy["core_message"]))

    campaign.strategy = strategy
    posts = ai.generate_content(campaign, "social_post", "Instagram", "Friendly", 2, "")
    assert len(posts) == 2
    assert all(p["headline"] and p["body"] and p["call_to_action"] for p in posts)
    print("headline:", ascii(posts[0]["headline"]))


def test_real_video_script_is_structured(ai, campaign):
    campaign.strategy = campaign.strategy or {"core_message": "Stay cold, stay sustainable."}
    script = ai.generate_content(campaign, "video_script", "TikTok", "Playful", 1, "")[0]
    assert script["scenes"] and script["hook"] and script["closing_call_to_action"]
