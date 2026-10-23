from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings, loaded from environment variables and backend/.env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Groq. The model ID lives here and nowhere else.
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_timeout_seconds: float = 45.0
    groq_max_retries: int = 2
    groq_max_output_tokens: int = 3000
    # Ask the provider for a JSON object. Turn off for models without JSON mode.
    groq_json_mode: bool = True

    # Backend
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'creatoros.db').as_posix()}"
    frontend_origin: str = "http://localhost:5173"

    # Limits that keep cost and latency predictable
    max_variations: int = 3
    max_brief_chars: int = 4000

    # Image uploads and generated visuals are stored here, outside the database.
    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    max_upload_mb: int = 5

    # Image generation (separate from Groq, which only produces text).
    # IMAGE_PROVIDER is "huggingface" (FLUX Space, uses HF_TOKEN) or "pollinations" (uses IMAGE_API_KEY).
    image_provider: str = "huggingface"
    image_api_key: str = ""
    image_model: str = "flux"
    image_timeout_seconds: float = 120.0
    image_max_retries: int = 1
    hf_token: str = ""
    hf_space_url: str = "https://black-forest-labs-flux-3-image-klein.hf.space"


@lru_cache
def get_settings() -> Settings:
    return Settings()
