from tests.conftest import CAMPAIGN, STRATEGY


def test_create_and_retrieve_campaign(client):
    created = client.post("/api/campaigns", json=CAMPAIGN)
    assert created.status_code == 201
    body = created.json()
    assert body["id"] and body["strategy"] is None and body["name"] == "Summer Launch"

    fetched = client.get(f"/api/campaigns/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["product_or_service"] == CAMPAIGN["product_or_service"]


def test_list_campaigns_includes_counts(client, campaign_with_strategy):
    rows = client.get("/api/campaigns").json()
    assert len(rows) == 1
    assert rows[0]["has_strategy"] is True
    assert rows[0]["asset_count"] == 0


def test_list_is_empty_without_data(client):
    assert client.get("/api/campaigns").json() == []


def test_missing_required_field_is_rejected(client):
    payload = {k: v for k, v in CAMPAIGN.items() if k != "objective"}
    response = client.post("/api/campaigns", json=payload)
    assert response.status_code == 422
    assert "objective" in response.json()["detail"]
    assert client.get("/api/campaigns").json() == []


def test_blank_and_invalid_values_are_rejected(client):
    assert client.post("/api/campaigns", json={**CAMPAIGN, "name": "   "}).status_code == 422
    assert client.post("/api/campaigns", json={**CAMPAIGN, "platform": "MySpace"}).status_code == 422
    assert client.post("/api/campaigns", json={**CAMPAIGN, "brief": "x" * 4001}).status_code == 422


def test_whitespace_is_trimmed(client):
    body = client.post("/api/campaigns", json={**CAMPAIGN, "name": "  Padded  "}).json()
    assert body["name"] == "Padded"


def test_patch_updates_only_sent_fields(client, campaign):
    response = client.patch(f"/api/campaigns/{campaign['id']}", json={"objective": "Grow awareness"})
    assert response.status_code == 200
    assert response.json()["objective"] == "Grow awareness"
    assert response.json()["name"] == CAMPAIGN["name"]


def test_patch_saves_edited_strategy(client, campaign_with_strategy):
    edited = {**STRATEGY, "core_message": "Edited by the user"}
    response = client.patch(
        f"/api/campaigns/{campaign_with_strategy['id']}", json={"strategy": edited}
    )
    assert response.status_code == 200
    assert response.json()["strategy"]["core_message"] == "Edited by the user"


def test_patch_rejects_invalid_strategy(client, campaign_with_strategy):
    bad = {**STRATEGY, "concepts": STRATEGY["concepts"][:2]}
    response = client.patch(f"/api/campaigns/{campaign_with_strategy['id']}", json={"strategy": bad})
    assert response.status_code == 422


def test_missing_campaign_returns_404(client):
    for call in (
        client.get("/api/campaigns/999"),
        client.patch("/api/campaigns/999", json={"name": "x"}),
        client.delete("/api/campaigns/999"),
        client.get("/api/campaigns/999/assets"),
        client.post("/api/campaigns/999/strategy"),
    ):
        assert call.status_code == 404
        assert call.json()["detail"]


def test_delete_campaign_removes_its_assets(client, campaign_with_strategy, use_ai):
    from tests.conftest import social_variations

    cid = campaign_with_strategy["id"]
    use_ai(social_variations(2))
    created = client.post(
        f"/api/campaigns/{cid}/generate-content",
        json={"content_type": "social_post", "platform": "Instagram", "tone": "Friendly", "variations": 2},
    ).json()
    assert client.delete(f"/api/campaigns/{cid}").status_code == 204
    assert client.get(f"/api/campaigns/{cid}").status_code == 404
    assert client.get(f"/api/assets/{created[0]['id']}").status_code == 404


def test_timestamps_are_returned_as_utc(client):
    body = client.post("/api/campaigns", json=CAMPAIGN).json()
    assert body["created_at"].endswith("Z") or body["created_at"].endswith("+00:00")
    assert client.get("/api/campaigns").json()[0]["created_at"].endswith(("Z", "+00:00"))
