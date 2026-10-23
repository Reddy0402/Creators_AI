"""File storage for images. Keys are generated here, never taken from clients, and always
resolved inside the upload directory."""

import re
from pathlib import Path

from app.config import get_settings
from app.errors import NotFoundError

# Keys look like "3f2a9c...(32 hex chars).jpg". Anything else is rejected.
_KEY_PATTERN = re.compile(r"^[0-9a-f]{32}\.(jpg|png|webp)$")


def upload_dir() -> Path:
    path = get_settings().upload_dir
    path.mkdir(parents=True, exist_ok=True)
    return path.resolve()


def path_for(storage_key: str) -> Path:
    if not _KEY_PATTERN.fullmatch(storage_key):
        raise ValueError(f"Invalid storage key: {storage_key!r}")
    base = upload_dir()
    path = (base / storage_key).resolve()
    if not path.is_relative_to(base):
        raise ValueError("Storage path escapes the upload directory")
    return path


def write(storage_key: str, data: bytes) -> None:
    path_for(storage_key).write_bytes(data)


def existing_path(storage_key: str) -> Path:
    path = path_for(storage_key)
    if not path.is_file():
        raise NotFoundError("The image file is missing from storage.")
    return path


def remove(storage_key: str) -> None:
    try:
        path_for(storage_key).unlink(missing_ok=True)
    except (OSError, ValueError):
        # A leftover file is harmless; it never gets served without a database row.
        pass
