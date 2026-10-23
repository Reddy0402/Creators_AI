"""Image generation. Separate from Groq: Groq only produces text.

Providers are called from the backend only, so API keys never reach the browser.
Generated files go through the same validation and storage as uploads.

Supported providers (IMAGE_PROVIDER):
- "huggingface": the FLUX Space on Hugging Face (needs HF_TOKEN).
- "pollinations": Pollinations AI (needs IMAGE_API_KEY).
"""

import json
import logging
import time
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from app.ai.image_prompts import ASPECT_SIZES, build_image_prompt
from app.config import Settings, get_settings
from app.models import VisualAsset
from app.services import campaign_service, visual_service
from app.services.ai_service import AIError

logger = logging.getLogger("creatoros.images")

POLLINATIONS = "pollinations"
HUGGINGFACE = "huggingface"

POLLINATIONS_URL = "https://gen.pollinations.ai/image/{prompt}"
FLUX_SPACE_MODEL = "black-forest-labs/flux-3-image-klein"
# Positional inputs for the Space's /generate endpoint, in its documented order:
# prompt, input images, model mode, seed, randomise seed, width, height, steps, guidance, upsampling.
FLUX_MODE = "Distilled (16 steps)"
FLUX_STEPS = 16
FLUX_GUIDANCE = 3.5


class ImageService:
    def __init__(self, settings: Settings | None = None, transport: httpx.BaseTransport | None = None):
        self.settings = settings or get_settings()
        self._transport = transport

    def generate(
        self,
        db: Session,
        campaign_id: int,
        *,
        asset_type: str,
        aspect_ratio: str,
        title: str,
        brief: str,
    ) -> VisualAsset:
        provider = self.settings.image_provider
        if provider == HUGGINGFACE:
            if not self.settings.hf_token.strip():
                raise AIError(503, _not_configured("HF_TOKEN"))
            model = FLUX_SPACE_MODEL
        elif provider == POLLINATIONS:
            if not self.settings.image_api_key.strip():
                raise AIError(503, _not_configured("IMAGE_API_KEY"))
            model = self.settings.image_model
        else:
            raise AIError(503, f"Unknown image provider '{provider}'.")

        campaign = campaign_service.get_campaign(db, campaign_id)
        prompt = build_image_prompt(campaign, asset_type, aspect_ratio, brief)
        width, height = ASPECT_SIZES[aspect_ratio]

        if provider == HUGGINGFACE:
            data = self._request_huggingface(prompt, width, height)
        else:
            data = self._request_pollinations(prompt, width, height)

        # Saved only after the provider returned a valid image. Failures never create a record.
        return visual_service.store_image(
            db,
            campaign_id,
            data,
            asset_type=asset_type,
            title=title,
            source="generated",
            prompt=prompt,
            provider=provider,
            model=model,
        )

    # ---- Hugging Face FLUX Space -------------------------------------------------------

    def _request_huggingface(self, prompt: str, width: int, height: int) -> bytes:
        base = self.settings.hf_space_url.rstrip("/")
        headers = {"Authorization": f"Bearer {self.settings.hf_token}"}
        payload = {
            "data": [prompt, None, FLUX_MODE, 0, True, width, height, FLUX_STEPS, FLUX_GUIDANCE, False]
        }
        started = time.monotonic()
        success = False
        error_name = "-"
        try:
            with self._client() as client:
                submitted = client.post(f"{base}/gradio_api/call/generate", json=payload, headers=headers)
                _check_status(submitted, "HF_TOKEN")
                event_id = submitted.json().get("event_id")
                if not event_id:
                    raise AIError(502, "The image provider returned an unexpected response.")

                result = client.get(f"{base}/gradio_api/call/generate/{event_id}", headers=headers)
                _check_status(result, "HF_TOKEN")
                image_url = _first_image_url(result.text, base)

                download = client.get(image_url, headers=headers)
                _check_status(download, "HF_TOKEN")
                if not download.headers.get("content-type", "").startswith("image/"):
                    raise AIError(502, "The image provider returned an unexpected response.")
                success = True
                return download.content
        except httpx.TimeoutException as exc:
            error_name = "timeout"
            raise AIError(504, "Image generation took too long. Please try again.") from exc
        except httpx.HTTPError as exc:
            error_name = "unreachable"
            raise AIError(502, "The image provider is unreachable right now.") from exc
        except AIError as exc:
            error_name = type(exc).__name__
            raise
        finally:
            self._log(HUGGINGFACE, FLUX_SPACE_MODEL, started, success, error_name)

    # ---- Pollinations ------------------------------------------------------------------

    def _request_pollinations(self, prompt: str, width: int, height: int) -> bytes:
        url = POLLINATIONS_URL.format(prompt=quote(prompt, safe=""))
        params = {
            "model": self.settings.image_model,
            "width": width,
            "height": height,
            "nologo": "true",
        }
        headers = {"Authorization": f"Bearer {self.settings.image_api_key}"}

        started = time.monotonic()
        success = False
        error_name = "-"
        attempt = 0
        try:
            with self._client() as client:
                while True:
                    try:
                        response = client.get(url, params=params, headers=headers)
                    except httpx.TimeoutException as exc:
                        if attempt < self.settings.image_max_retries:
                            attempt += 1
                            continue
                        raise AIError(504, "Image generation took too long. Please try again.") from exc
                    except httpx.HTTPError as exc:
                        raise AIError(502, "The image provider is unreachable right now.") from exc

                    if response.status_code == 200:
                        if not response.headers.get("content-type", "").startswith("image/"):
                            raise AIError(502, "The image provider returned an unexpected response.")
                        success = True
                        return response.content
                    if response.status_code >= 500 and attempt < self.settings.image_max_retries:
                        attempt += 1
                        continue
                    _check_status(response, "IMAGE_API_KEY")
        except AIError as exc:
            error_name = type(exc).__name__
            raise
        finally:
            self._log(POLLINATIONS, self.settings.image_model, started, success, error_name)

    # ---- helpers -----------------------------------------------------------------------

    def _client(self) -> httpx.Client:
        return httpx.Client(
            timeout=httpx.Timeout(self.settings.image_timeout_seconds),
            transport=self._transport,
        )

    @staticmethod
    def _log(provider: str, model: str, started: float, success: bool, error_name: str) -> None:
        # Logs operational details only; never keys or prompts.
        logger.info(
            "image_call provider=%s model=%s duration_ms=%d success=%s error=%s",
            provider,
            model,
            int((time.monotonic() - started) * 1000),
            success,
            error_name,
        )


def _not_configured(variable: str) -> str:
    return (
        f"Image generation isn't set up. Add {variable} to backend/.env and restart the backend, "
        "or upload your own image instead."
    )


def _check_status(response: httpx.Response, key_variable: str) -> None:
    """Map a provider HTTP status to a user-safe error. Passes 2xx through unchanged."""
    if response.status_code < 300:
        return
    if response.status_code in (401, 403):
        raise AIError(502, f"The image provider rejected the configured {key_variable}.")
    if response.status_code == 429:
        raise AIError(429, "The image provider is rate limiting requests. Try again shortly.")
    if response.status_code == 402:
        raise AIError(402, "The image provider account is out of credit.")
    raise AIError(502, f"The image provider failed (status {response.status_code}).")


def _first_image_url(sse_text: str, base: str) -> str:
    """Read a Gradio event stream and return the URL of the first image in the result.

    The URL must stay on the Space's own host, so the token is never sent elsewhere.
    """
    event = None
    for line in sse_text.splitlines():
        if line.startswith("event:"):
            event = line[len("event:"):].strip()
        elif line.startswith("data:") and event == "error":
            raise AIError(502, "The image provider reported an error. Please try again.")
        elif line.startswith("data:") and event == "complete":
            outputs = json.loads(line[len("data:"):].strip())
            for output in outputs:
                if isinstance(output, dict) and output.get("url"):
                    url = output["url"]
                    if url.startswith("/"):
                        url = base + url
                    if not url.startswith(base + "/"):
                        raise AIError(502, "The image provider returned an unexpected file location.")
                    return url
    raise AIError(502, "The image provider didn't return an image. Please try again.")


_service: ImageService | None = None


def get_image_service() -> ImageService:
    """FastAPI dependency. Tests replace this with a service that uses a mock transport."""
    global _service
    if _service is None:
        _service = ImageService()
    return _service
