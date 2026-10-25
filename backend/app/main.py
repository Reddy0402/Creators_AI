import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import assets, campaigns, images
from app.config import get_settings
from app.database import init_db
from app.errors import AppError
from app.services.ai_service import AIError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    if not get_settings().groq_api_key.strip():
        logging.getLogger("creatoros").warning(
            "GROQ_API_KEY is not set. Generation will fail until it is configured in backend/.env."
        )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CreatorOS AI", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Every error leaves the API as {"detail": "<message>"}; validation errors add "fields".
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse({"detail": exc.message}, status_code=exc.status_code)

    @app.exception_handler(AIError)
    async def _ai_error(_: Request, exc: AIError):
        return JSONResponse({"detail": exc.message}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        fields = {
            ".".join(str(p) for p in e["loc"] if p != "body"): e["msg"] for e in exc.errors()
        }
        first_field, first_msg = next(iter(fields.items()), ("request", "is invalid"))
        return JSONResponse(
            {"detail": f"Please check '{first_field}': {first_msg}.", "fields": fields},
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def _general_error(_: Request, exc: Exception):
        logging.getLogger("creatoros").exception("Unhandled server error: %s", exc)
        return JSONResponse(
            {"detail": f"Server error: {str(exc) or type(exc).__name__}"},
            status_code=500,
        )

    app.include_router(campaigns.router, prefix="/api")
    app.include_router(assets.router, prefix="/api")
    app.include_router(images.router, prefix="/api")

    @app.get("/api/health", tags=["health"])
    def health():
        # Reports whether generation is configured; never returns the key itself.
        return {
            "status": "ok",
            "ai_configured": bool(settings.groq_api_key.strip()),
            "image_configured": bool(
                (settings.hf_token if settings.image_provider == "huggingface" else settings.image_api_key).strip()
            ),
        }

    return app


app = create_app()
