"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration for the Trade Journal backend."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    flask_env: str = Field(default="development", alias="FLASK_ENV")
    secret_key: str = Field(default="dev-secret-key", alias="SECRET_KEY")
    database_url: str = Field(
        default=f"sqlite:///{(BACKEND_ROOT / 'data' / 'journal.db').as_posix()}",
        alias="DATABASE_URL",
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    mt4_adapter: Literal["demo", "bridge"] = Field(
        default="demo",
        alias="MT4_ADAPTER",
    )
    mt4_bridge_path: Path = Field(
        default=BACKEND_ROOT / "data" / "mt4_bridge",
        alias="MT4_BRIDGE_PATH",
    )
    mt4_bridge_stale_seconds: int = Field(
        default=120,
        alias="MT4_BRIDGE_STALE_SECONDS",
    )
    sync_interval_seconds: int = Field(
        default=60,
        alias="SYNC_INTERVAL_SECONDS",
    )
    upload_root: Path = Field(
        default=BACKEND_ROOT / "data" / "uploads",
        alias="UPLOAD_ROOT",
    )
    max_upload_bytes: int = Field(
        default=8 * 1024 * 1024,
        alias="MAX_UPLOAD_BYTES",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()