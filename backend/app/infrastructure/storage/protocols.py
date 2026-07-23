"""Storage protocol — swap LocalFileStorage for S3/R2 later with zero call-site changes."""

from __future__ import annotations

from typing import BinaryIO, Optional, Protocol


class ObjectStorage(Protocol):
    """Abstract object storage for trade/backtest images."""

    def save(
        self,
        *,
        folder: str,
        filename: str,
        stream: BinaryIO,
        content_type: Optional[str] = None,
    ) -> str:
        """Persist a file and return a storage-relative path."""

    def absolute_path(self, relative_path: str) -> str:
        """Resolve a stored path to an absolute filesystem path (local only)."""

    def delete(self, relative_path: str) -> None:
        """Delete a stored object if it exists."""
