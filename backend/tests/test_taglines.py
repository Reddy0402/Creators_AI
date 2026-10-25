import json


TAGLINE_VARIATION = {
    "variations": [
        {
            "tagline": "Hydration, Elevated.",
            "style": "Catchy & Punchy",
            "rationale": "Directly links pure function to premium lifestyle.",
            "keywords": ["hydration", "pure", "sustainable"],
        },
        {
            "tagline": "Cold for 24 Hours. Kind to Earth Forever.",
            "style": "Benefit-Driven",
            "rationale": "Highlights key product fact with emotional environmental impact.",
            "keywords": ["temperature", "eco-friendly"],
        },
    ]
}


def test_generate_taglines_returns_items(client, use_ai, campaign):
    fake = use_ai(TAGLINE_VARIATION)
    res = client.post(
        f"/api/campaigns/{campaign['id']}/generate-taglines",
        json={
            "company_name": "EcoSip Technologies",
            "industry": "Eco-Friendly Drinkware",
            "differentiator": "Vacuum insulated recycled steel",
            "style": "Catchy & Punchy",
            "count": 2,
        },
    )
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    assert items[0]["tagline"] == "Hydration, Elevated."
    assert items[0]["style"] == "Catchy & Punchy"
    assert len(fake.calls) == 1
    system, user = fake.calls[0]["messages"]
    assert "EcoSip Technologies" in user["content"]
    assert "Catchy & Punchy" in system["content"]


def test_save_tagline_persists_asset(client, campaign):
    res = client.post(
        f"/api/campaigns/{campaign['id']}/taglines",
        json={
            "tagline": "Pure Chill. Zero Waste.",
            "style": "Minimalist & Modern",
            "rationale": "Striking and modern phrase matching the clean steel aesthetic.",
            "keywords": ["chill", "zero waste"],
        },
    )
    assert res.status_code == 201
    saved = res.json()
    assert saved["campaign_id"] == campaign["id"]
    assert saved["content_type"] == "tagline"
    assert saved["title"] == "Pure Chill. Zero Waste."
    assert saved["content"]["tagline"] == "Pure Chill. Zero Waste."
    assert saved["content"]["style"] == "Minimalist & Modern"

    # Verify asset is returned in list
    assets = client.get(f"/api/campaigns/{campaign['id']}/assets").json()
    taglines = [a for a in assets if a["content_type"] == "tagline"]
    assert len(taglines) == 1
    assert taglines[0]["id"] == saved["id"]
