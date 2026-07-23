"""Local filesystem storage for uploaded images."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import BinaryIO, Optional

from werkzeug.utils import secure_filename

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class LocalFileStorage:
    """Store files under backend/data — only the relative path goes in SQLite."""

    def __init__(self, root: Optional[Path] = None) -> None:
        settings = get_settings()
        self._root = Path(root or settings.upload_root).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def save(
        self,
        *,
        folder: str,
        filename: str,
        stream: BinaryIO,
        content_type: Optional[str] = None,
    ) -> str:
        safe_name = secure_filename(filename) or "upload.bin"
        destination_dir = self._root / folder
        destination_dir.mkdir(parents=True, exist_ok=True)
        destination = destination_dir / safe_name
        with destination.open("wb") as handle:
            while True:
                chunk = stream.read(1024 * 64)
                if not chunk:
                    break
                handle.write(chunk)
        relative = f"{folder}/{safe_name}".replace("\\", "/")
        logger.info("Saved upload %s (%s)", relative, content_type or "unknown")
        return relative

    def absolute_path(self, relative_path: str) -> str:
        cleaned = relative_path.replace("\\", "/").lstrip("/")
        path = (self._root / cleaned).resolve()
        if not str(path).startswith(str(self._root)):
            raise ValueError("Invalid storage path")
        return str(path)

    def delete(self, relative_path: str) -> None:
        try:
            path = Path(self.absolute_path(relative_path))
            if path.is_file():
                path.unlink()
        except Exception:
            logger.exception("Failed to delete stored file %s", relative_path)
