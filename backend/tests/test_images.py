import json
import re
from io import BytesIO

import httpx
import pytest
from PIL import Image

from app.config import Settings, get_settings
from app.main import app
from app.services import visual_service
from app.services.ai_service import AIError
from app.services.image_service import ImageService, get_image_service
from tests.conftest import CAMPAIGN

KEY = "img-test-key-123"
HF_TOKEN = "hf-test-token-456"
HF_BASE = "https://example-space.hf.space"
STORAGE_NAME = re.compile(r"^[0-9a-f]{32}\.(jpg|png|webp)$")


def stored_files(upload_dir):
    return list(upload_dir.iterdir()) if upload_dir.exists() else []


def make_image(fmt="PNG", size=(64, 48)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, (120, 80, 200)).save(buffer, format=fmt)
    return buffer.getvalue()


def upload(client, campaign_id, data=None, *, name="photo.png", content_type="image/png", asset_type="product_image", title=""):
    return client.post(
        f"/api/campaigns/{campaign_id}/images",
        files={"file": (name, data if data is not None else make_image(), content_type)},
        data={"asset_type": asset_type, "title": title},
    )


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    """Each test gets its own upload directory."""
    path = tmp_path / "uploads"
    monkeypatch.setenv("UPLOAD_DIR", str(path))
    get_settings.cache_clear()
    yield path
    get_settings.cache_clear()


@pytest.fixture
def image_service(client):
    """image_service(handler) swaps in a fake provider and returns the list of requests it saw."""
    seen: list[httpx.Request] = []

    def _use(handler, **settings):
        def wrapped(request: httpx.Request) -> httpx.Response:
            seen.append(request)
            return handler(request)

        values = {"image_api_key": KEY, "image_provider": "pollinations", "hf_token": HF_TOKEN, **settings}
        cfg = Settings(_env_file=None, **values)
        service = ImageService(cfg, transport=httpx.MockTransport(wrapped))
        app.dependency_overrides[get_image_service] = lambda: service
        return seen

    return _use


# ---- uploads --------------------------------------------------------------------------


def test_upload_is_stored_and_served_back(client, campaign, upload_dir):
    response = upload(client, campaign["id"], title="Bottle on desk")
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Bottle on desk"
    assert body["source"] == "upload" and body["asset_type"] == "product_image"
    assert (body["width"], body["height"], body["mime_type"]) == (64, 48, "image/png")
    assert body["url"] == f"/api/images/{body['id']}/file"

    served = client.get(body["url"])
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/png"
    assert served.headers["x-content-type-options"] == "nosniff"
    assert served.content == make_image()


def test_stored_file_gets_a_generated_name_not_the_client_name(client, campaign, upload_dir):
    upload(client, campaign["id"], name="../../etc/passwd.png")
    files = [p.name for p in upload_dir.iterdir()]
    assert len(files) == 1 and STORAGE_NAME.match(files[0])


def test_declared_type_is_ignored_and_real_bytes_are_checked(client, campaign, upload_dir):
    response = upload(client, campaign["id"], data=b"<html>not a picture</html>", name="cat.png")
    assert response.status_code == 422
    assert "isn't a valid image" in response.json()["detail"]
    assert stored_files(upload_dir) == []


def test_jpeg_and_webp_are_accepted(client, campaign):
    assert upload(client, campaign["id"], make_image("JPEG"), name="a.jpg", content_type="image/jpeg").status_code == 201
    assert upload(client, campaign["id"], make_image("WEBP"), name="b.webp", content_type="image/webp").status_code == 201


def test_gif_is_rejected_as_unsupported_type(client, campaign):
    response = upload(client, campaign["id"], make_image("GIF"), name="x.gif", content_type="image/gif")
    assert response.status_code == 415
    assert "JPEG, PNG and WebP" in response.json()["detail"]


def test_oversized_upload_is_rejected(client, campaign, upload_dir, monkeypatch):
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    get_settings.cache_clear()
    response = upload(client, campaign["id"], b"x" * (1024 * 1024 + 10))
    assert response.status_code == 413
    assert "1 MB" in response.json()["detail"]
    assert stored_files(upload_dir) == []


def test_empty_upload_is_rejected(client, campaign):
    response = upload(client, campaign["id"], b"")
    assert response.status_code == 422
    assert "empty" in response.json()["detail"]


def test_unknown_asset_type_is_rejected(client, campaign):
    assert upload(client, campaign["id"], asset_type="podcast_cover").status_code == 422


def test_pixel_limit_is_enforced(monkeypatch):
    monkeypatch.setattr(visual_service, "MAX_PIXELS", 100)
    with pytest.raises(Exception) as excinfo:
        visual_service.inspect_image(make_image(size=(64, 64)))
    assert "too large" in excinfo.value.message


def test_missing_campaign_returns_404(client):
    response = upload(client, 999)
    assert response.status_code == 404


# ---- listing, thumbnails, deletion ----------------------------------------------------


def test_list_and_fetch_metadata(client, campaign):
    first = upload(client, campaign["id"], title="First").json()
    second = upload(client, campaign["id"], title="Second", asset_type="hero_banner").json()

    listed = client.get(f"/api/campaigns/{campaign['id']}/images").json()
    assert [v["id"] for v in listed] == [second["id"], first["id"]]

    fetched = client.get(f"/api/images/{first['id']}").json()
    assert fetched["title"] == "First"


def test_campaign_list_shows_thumbnail_only_when_an_image_exists(client, campaign):
    summary = client.get("/api/campaigns").json()[0]
    assert summary["thumbnail_url"] is None

    image = upload(client, campaign["id"]).json()
    summary = client.get("/api/campaigns").json()[0]
    assert summary["thumbnail_url"] == image["url"]


def test_default_title_when_none_given(client, campaign):
    assert upload(client, campaign["id"], asset_type="ad_creative").json()["title"] == "Ad creative"


def test_delete_removes_row_and_file(client, campaign, upload_dir):
    image = upload(client, campaign["id"]).json()
    assert client.delete(f"/api/images/{image['id']}").status_code == 204
    assert client.get(f"/api/images/{image['id']}").status_code == 404
    assert client.get(image["url"]).status_code == 404
    assert stored_files(upload_dir) == []


def test_deleting_campaign_removes_its_files(client, campaign, upload_dir):
    upload(client, campaign["id"])
    upload(client, campaign["id"], asset_type="hero_banner")
    assert len(list(upload_dir.iterdir())) == 2
    assert client.delete(f"/api/campaigns/{campaign['id']}").status_code == 204
    assert stored_files(upload_dir) == []


def test_missing_image_returns_404(client):
    assert client.get("/api/images/999").status_code == 404
    assert client.get("/api/images/999/file").status_code == 404
    assert client.delete("/api/images/999").status_code == 404


def test_file_missing_from_disk_is_reported_not_crashed(client, campaign, upload_dir):
    image = upload(client, campaign["id"]).json()
    for path in upload_dir.iterdir():
        path.unlink()
    response = client.get(image["url"])
    assert response.status_code == 404
    assert "missing" in response.json()["detail"]


# ---- generation -----------------------------------------------------------------------


def test_generation_without_key_explains_how_to_fix(client, campaign, upload_dir):
    app.dependency_overrides[get_image_service] = lambda: ImageService(
        Settings(_env_file=None, image_api_key="", image_provider="pollinations")
    )
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 503
    assert "IMAGE_API_KEY" in response.json()["detail"]
    assert stored_files(upload_dir) == []


def test_generation_saves_a_provider_image_with_its_prompt(client, campaign, image_service):
    png = make_image("JPEG", size=(1024, 1024))
    seen = image_service(lambda request: httpx.Response(200, content=png, headers={"content-type": "image/jpeg"}))

    response = client.post(
        f"/api/campaigns/{campaign['id']}/generate-image",
        json={"asset_type": "hero_banner", "aspect_ratio": "landscape", "title": "", "brief": "morning light"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["source"] == "generated" and body["provider"] == "pollinations" and body["model"] == "flux"
    assert body["asset_type"] == "hero_banner"
    assert "Reusable steel water bottle" in body["prompt"]  # built from the saved campaign
    assert "morning light" in body["prompt"]
    assert "No logos" in body["prompt"]

    request = seen[0]
    assert request.headers["authorization"] == f"Bearer {KEY}"
    assert request.url.params["width"] == "1344" and request.url.params["height"] == "768"
    assert KEY not in response.text  # the key never appears in responses

    assert client.get(body["url"]).content == png


def test_generation_failure_creates_no_record(client, campaign, image_service, upload_dir):
    image_service(lambda request: httpx.Response(401, json={"error": "bad key"}))
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 502
    assert "rejected the configured IMAGE_API_KEY" in response.json()["detail"]
    assert client.get(f"/api/campaigns/{campaign['id']}/images").json() == []
    assert stored_files(upload_dir) == []


def test_rate_limit_is_reported(client, campaign, image_service):
    image_service(lambda request: httpx.Response(429))
    assert client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={}).status_code == 429


def test_non_image_reply_is_not_saved(client, campaign, image_service):
    image_service(lambda request: httpx.Response(200, text="<html>oops</html>", headers={"content-type": "text/html"}))
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 502
    assert client.get(f"/api/campaigns/{campaign['id']}/images").json() == []


def test_transient_server_error_is_retried_once(client, campaign, image_service):
    png = make_image("PNG")
    replies = iter([httpx.Response(500), httpx.Response(200, content=png, headers={"content-type": "image/png"})])
    seen = image_service(lambda request: next(replies))
    assert client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={}).status_code == 201
    assert len(seen) == 2


def test_repeated_timeouts_give_a_clear_message(client, campaign, image_service):
    def timeout(request):
        raise httpx.ReadTimeout("slow", request=request)

    seen = image_service(timeout)
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 504
    assert len(seen) == 2  # first try plus one retry


def test_generation_without_provider_key_is_clear(client, campaign):
    app.dependency_overrides[get_image_service] = lambda: ImageService(
        Settings(_env_file=None, image_api_key="", image_provider="other")
    )
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 503
    assert "Unknown image provider" in response.json()["detail"]


def test_prompt_uses_campaign_fields_and_avoids_logos():
    from app.ai.image_prompts import build_image_prompt
    from app.models import Campaign

    campaign = Campaign(**CAMPAIGN)
    prompt = build_image_prompt(campaign, "social_post", "portrait", "")
    assert "Urban commuters aged 22-35" in prompt
    assert "Drive pre-orders" in prompt
    assert "4:5 portrait" in prompt
    assert len(prompt) <= 1000
    assert "Additional visual direction" not in prompt


# ---- Hugging Face FLUX Space ----------------------------------------------------------

PNG_BYTES = make_image("PNG", size=(1024, 1024))


def _space_handler(*, image_url=None, status=200, event="complete", seen_payloads=None):
    """A fake Gradio Space: submit, poll the event stream, then serve the file."""
    image_url = image_url or f"{HF_BASE}/gradio_api/file=/tmp/gradio/abc/image.png"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/gradio_api/call/generate":
            if seen_payloads is not None:
                seen_payloads.append(json.loads(request.content))
            return httpx.Response(status, json={"event_id": "evt-1"})
        if request.url.path == "/gradio_api/call/generate/evt-1":
            body = (
                f"event: {event}\ndata: "
                + json.dumps([{"url": image_url, "path": "/tmp/x.png"}, 42, "expanded prompt"])
                + "\n\n"
            )
            return httpx.Response(200, text=body)
        if request.url.path.endswith("/image.png"):
            return httpx.Response(200, content=PNG_BYTES, headers={"content-type": "image/png"})
        return httpx.Response(404)

    return handler


def test_huggingface_generation_saves_the_space_image(client, campaign, image_service):
    payloads: list = []
    seen = image_service(
        _space_handler(seen_payloads=payloads),
        image_provider="huggingface",
        hf_space_url=HF_BASE,
    )
    response = client.post(
        f"/api/campaigns/{campaign['id']}/generate-image",
        json={"asset_type": "social_post", "aspect_ratio": "portrait", "title": "", "brief": ""},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["provider"] == "huggingface"
    assert body["model"] == "black-forest-labs/flux-3-image-klein"
    assert (body["width"], body["height"]) == (1024, 1024)
    assert "Reusable steel water bottle" in body["prompt"]

    # Prompt, size and fixed settings were sent in the Space's expected order.
    data = payloads[0]["data"]
    assert data[0] == body["prompt"]
    assert (data[5], data[6]) == (896, 1120)
    assert data[2] == "Distilled (16 steps)"

    # Token only goes to the Space's own host.
    assert all(
        request.headers.get("authorization") == f"Bearer {HF_TOKEN}"
        for request in seen
        if request.url.host == "example-space.hf.space"
    )
    assert HF_TOKEN not in response.text
    assert client.get(body["url"]).content == PNG_BYTES


def test_huggingface_missing_token_is_explained(client, campaign):
    app.dependency_overrides[get_image_service] = lambda: ImageService(
        Settings(_env_file=None, image_provider="huggingface", hf_token="")
    )
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 503
    assert "HF_TOKEN" in response.json()["detail"]


def test_huggingface_rejected_token_gives_clear_message(client, campaign, image_service):
    image_service(_space_handler(status=401), image_provider="huggingface", hf_space_url=HF_BASE)
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 502
    assert "HF_TOKEN" in response.json()["detail"]
    assert client.get(f"/api/campaigns/{campaign['id']}/images").json() == []


def test_huggingface_error_event_creates_no_record(client, campaign, image_service):
    image_service(_space_handler(event="error"), image_provider="huggingface", hf_space_url=HF_BASE)
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 502
    assert client.get(f"/api/campaigns/{campaign['id']}/images").json() == []


def test_huggingface_file_on_another_host_is_refused(client, campaign, image_service):
    image_service(
        _space_handler(image_url="https://evil.example.com/steal.png"),
        image_provider="huggingface",
        hf_space_url=HF_BASE,
    )
    response = client.post(f"/api/campaigns/{campaign['id']}/generate-image", json={})
    assert response.status_code == 502
    assert "unexpected file location" in response.json()["detail"]
