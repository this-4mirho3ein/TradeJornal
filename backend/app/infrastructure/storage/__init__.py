"""Storage factory."""

from __future__ import annotations

from functools import lru_cache

from app.infrastructure.storage.local import LocalFileStorage


@lru_cache
def get_storage() -> LocalFileStorage:
    """Return the configured object storage (local for now)."""
    return LocalFileStorage()
