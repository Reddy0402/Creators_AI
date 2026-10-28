import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

SUPPORTED_DB_SCHEMES = ("sqlite", "postgresql", "postgresql+psycopg", "postgresql+psycopg2")


def _default_db_url() -> str:
    if os.environ.get("VERCEL"):
        return "sqlite:////tmp/creatoros.db"
    return f"sqlite:///{(BACKEND_DIR / 'data' / 'creatoros.db').as_posix()}"


def normalize_database_url(url: str) -> str:
    """Validate a DATABASE_URL and normalize it to a SQLAlchemy-supported form.

    Raises ValueError with an actionable message instead of failing deep in the
    driver at first request, so a bad setup is obvious at startup.
    """
    stripped = url.strip()
    if not stripped:
        raise ValueError(
            "DATABASE_URL is empty. Set it in backend/.env, e.g. "
            "DATABASE_URL=postgresql+psycopg://user:password@host:5432/creatoros"
        )
    parsed = urlparse(stripped)
    scheme = (parsed.scheme or "").lower()
    if scheme not in SUPPORTED_DB_SCHEMES:
        raise ValueError(
            f"Unsupported DATABASE_URL scheme '{parsed.scheme}'. Supported schemes: "
            f"{', '.join(SUPPORTED_DB_SCHEMES)}. For Neon/PostgreSQL use "
            "postgresql+psycopg://user:password@host/db"
        )
    if scheme.startswith("postgres") and not parsed.username:
        raise ValueError(
            "DATABASE_URL has no username. PostgreSQL connections need "
            "postgresql+psycopg://user:password@host:port/dbname"
        )
    if scheme.startswith("postgres") and not parsed.hostname:
        raise ValueError("DATABASE_URL has no host. Include host (and port) after the @ symbol.")
    return stripped


def _default_upload_dir() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/uploads")
    return BACKEND_DIR / "data" / "uploads"


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
    database_url: str = Field(default_factory=_default_db_url)
    frontend_origin: str = "*" if os.environ.get("VERCEL") else "http://localhost:5173"

    @field_validator("database_url")
    @classmethod
    def _check_database_url(cls, value: str) -> str:
        try:
            return normalize_database_url(value)
        except ValueError as exc:
            # pydantic-settings converts ValueError to a SettingsError with the
            # original message, so the actionable hint still reaches the user.
            raise ValueError(str(exc)) from None

    # Limits that keep cost and latency predictable
    max_variations: int = 3
    max_brief_chars: int = 4000

    # Image uploads and generated visuals are stored here, outside the database.
    upload_dir: Path = Field(default_factory=_default_upload_dir)
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
