"""Synchronization log repository."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sync_log import SyncLog


class SyncLogRepository:
    """Persistence operations for sync audit logs."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        status: str,
        source: str,
        account_number: Optional[int] = None,
        inserted_trades: int = 0,
        updated_trades: int = 0,
        open_positions: int = 0,
        duration_ms: int = 0,
        message: str = "",
        error: Optional[str] = None,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None,
    ) -> SyncLog:
        """Create a synchronization log entry."""
        entry = SyncLog(
            status=status,
            source=source,
            account_number=account_number,
            inserted_trades=inserted_trades,
            updated_trades=updated_trades,
            open_positions=open_positions,
            duration_ms=duration_ms,
            message=message,
            error=error,
            started_at=started_at or datetime.utcnow(),
            finished_at=finished_at or datetime.utcnow(),
        )
        self._session.add(entry)
        self._session.flush()
        return entry

    def list_recent(self, limit: int = 20) -> List[SyncLog]:
        """Return the most recent sync logs."""
        statement = select(SyncLog).order_by(SyncLog.started_at.desc()).limit(limit)
        return list(self._session.scalars(statement).all())