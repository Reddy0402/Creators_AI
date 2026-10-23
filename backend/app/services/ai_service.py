"""The only module that talks to Groq.

Responsibilities: build the client from settings, send a prompt, retry transient failures
a bounded number of times, parse and validate the JSON reply, and turn every failure into
an AIError with a message that is safe to show to the user (never containing credentials).
"""

import json
import logging
import re
import time
from typing import Any

import groq
from pydantic import BaseModel, ValidationError

from app.ai import prompts
from app.ai.output_models import CONTENT_MODELS, StrategyOut
from app.config import Settings, get_settings
from app.models import Campaign, CreativeAsset

logger = logging.getLogger("creatoros.ai")

# Indirection so tests can skip real waiting.
_sleep = time.sleep

_MAX_BACKOFF_SECONDS = 8.0


class AIError(Exception):
    """A generation failure with an HTTP status and a user-safe message."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class AIConfigError(AIError):
    def __init__(self):
        super().__init__(
            503,
            "Content generation isn't configured. Set GROQ_API_KEY in backend/.env "
            "and restart the backend.",
        )


class AIService:
    def __init__(self, settings: Settings | None = None, client: Any = None):
        self.settings = settings or get_settings()
        self._client = client

    # ---- public operations -------------------------------------------------------------

    def generate_strategy(self, campaign: Campaign) -> dict:
        messages = prompts.strategy_messages(campaign)
        result = self._complete("strategy", messages, StrategyOut, temperature=0.7)
        return result.model_dump()

    def generate_content(
        self,
        campaign: Campaign,
        content_type: str,
        platform: str,
        tone: str,
        variations: int,
        instructions: str,
    ) -> list[dict]:
        variations = min(variations, self.settings.max_variations)
        messages = prompts.content_messages(
            campaign, content_type, platform, tone, variations, instructions
        )
        _, wrapper = CONTENT_MODELS[content_type]
        result = self._complete(f"content:{content_type}", messages, wrapper, temperature=0.8)
        # Never return more than was asked for, even if the model over-delivers.
        return [item.model_dump() for item in result.variations[:variations]]

    def refine_content(
        self, campaign: Campaign, asset: CreativeAsset, action: str, target_platform: str | None
    ) -> dict:
        messages = prompts.refine_messages(campaign, asset, action, target_platform)
        item_model, _ = CONTENT_MODELS[asset.content_type]
        result = self._complete(f"refine:{action}", messages, item_model, temperature=0.6)
        return result.model_dump()

    # ---- internals ---------------------------------------------------------------------

    def _get_client(self):
        if self._client is None:
            if not self.settings.groq_api_key.strip():
                raise AIConfigError()
            self._client = groq.Groq(
                api_key=self.settings.groq_api_key,
                timeout=self.settings.groq_timeout_seconds,
                max_retries=0,  # retries are handled here so they stay bounded and logged
            )
        return self._client

    def _complete(
        self, operation: str, messages: list[dict], model_cls: type[BaseModel], temperature: float
    ) -> Any:
        """Call the model and return a validated instance of model_cls."""
        client = self._get_client()
        started = time.monotonic()
        success = False
        error_class = ""
        calls = 0
        try:
            use_json_mode = self.settings.groq_json_mode
            conversation = list(messages)
            repaired = False
            while True:
                calls += 1
                try:
                    raw = self._call_with_retries(client, conversation, temperature, use_json_mode)
                except groq.BadRequestError as exc:
                    # JSON mode can be rejected by a model, or fail when the model emits
                    # invalid JSON. Fall back once to plain generation and parse it ourselves.
                    if use_json_mode:
                        use_json_mode = False
                        continue
                    raise self._map_error(exc) from exc

                try:
                    parsed = model_cls.model_validate(_extract_json(raw))
                    success = True
                    return parsed
                except (ValueError, ValidationError) as exc:
                    if repaired:
                        raise AIError(
                            502,
                            "The model returned a response that couldn't be used. "
                            "Please try again.",
                        ) from exc
                    # Ask once for a corrected reply instead of failing immediately.
                    repaired = True
                    conversation = [
                        *messages,
                        {"role": "assistant", "content": raw[:6000]},
                        {
                            "role": "user",
                            "content": "That reply was not valid for the required JSON schema. "
                            "Reply again with only the corrected JSON object.",
                        },
                    ]
        except AIError as exc:
            error_class = type(exc).__name__
            raise
        finally:
            logger.info(
                "ai_call operation=%s model=%s duration_ms=%d calls=%d success=%s error=%s",
                operation,
                self.settings.groq_model,
                int((time.monotonic() - started) * 1000),
                calls,
                success,
                error_class or "-",
            )

    def _call_with_retries(self, client, messages, temperature, json_mode) -> str:
        """One logical call. Retries only transient failures, at most groq_max_retries times."""
        kwargs: dict[str, Any] = {
            "model": self.settings.groq_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": self.settings.groq_max_output_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        attempt = 0
        while True:
            try:
                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                if not content or not content.strip():
                    raise AIError(502, "The model returned an empty response. Please try again.")
                return content
            except groq.BadRequestError:
                raise  # handled by the caller; never retried here
            except groq.APIError as exc:
                if not _is_transient(exc) or attempt >= self.settings.groq_max_retries:
                    raise self._map_error(exc) from exc
                attempt += 1
                _sleep(_backoff_seconds(exc, attempt))

    @staticmethod
    def _map_error(exc: Exception) -> AIError:
        if isinstance(exc, groq.AuthenticationError | groq.PermissionDeniedError):
            return AIError(
                502,
                "The AI provider rejected the configured credentials. "
                "Check GROQ_API_KEY in backend/.env.",
            )
        if isinstance(exc, groq.RateLimitError):
            return AIError(
                429, "The AI provider is rate limiting requests. Wait a moment and try again."
            )
        if isinstance(exc, groq.APITimeoutError):
            return AIError(504, "The AI provider took too long to respond. Please try again.")
        if isinstance(exc, groq.BadRequestError | groq.UnprocessableEntityError):
            return AIError(400, "The request couldn't be processed. Try simplifying the input.")
        if isinstance(exc, groq.NotFoundError):
            return AIError(
                502, "The configured model wasn't found. Check GROQ_MODEL in backend/.env."
            )
        return AIError(502, "The AI provider is unavailable right now. Please try again shortly.")


def _is_transient(exc: Exception) -> bool:
    if isinstance(exc, groq.RateLimitError | groq.APITimeoutError | groq.APIConnectionError):
        return True
    return isinstance(exc, groq.APIStatusError) and exc.status_code >= 500


def _backoff_seconds(exc: Exception, attempt: int) -> float:
    delay = float(2 ** (attempt - 1))  # 1s, 2s, 4s...
    response = getattr(exc, "response", None)
    retry_after = getattr(response, "headers", {}).get("retry-after") if response else None
    try:
        if retry_after:
            delay = max(delay, float(retry_after))
    except (TypeError, ValueError):
        pass
    return min(delay, _MAX_BACKOFF_SECONDS)


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _extract_json(text: str) -> Any:
    """Parse model output as JSON, tolerating code fences and surrounding prose."""
    cleaned = _FENCE.sub("", text.strip()).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object in model output") from None
        return json.loads(cleaned[start : end + 1])


_service: AIService | None = None


def get_ai_service() -> AIService:
    """FastAPI dependency. Tests override this with a service backed by a fake client."""
    global _service
    if _service is None:
        _service = AIService()
    return _service
