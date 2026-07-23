"""Synchronization service.

Never mix sync responsibilities into API controllers.
Persists MetaTrader snapshots into SQLite using idempotent UPSERT.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import SyncError
from app.infrastructure.mt4.client import MT4Client, create_mt4_client
from app.infrastructure.mt4.dto import MT4Snapshot
from app.repositories.account_repository import AccountRepository
from app.repositories.sync_log_repository import SyncLogRepository
from app.repositories.trade_repository import TradeRepository

logger = logging.getLogger(__name__)


class SyncService:
    """Connects to MT4, reads account data, and upserts into SQLite."""

    def __init__(
        self,
        session: Session,
        mt4_client: Optional[MT4Client] = None,
    ) -> None:
        self._session = session
        self._mt4 = mt4_client or create_mt4_client()
        self._accounts = AccountRepository(session)
        self._trades = TradeRepository(session)
        self._sync_logs = SyncLogRepository(session)

    def inspect(self) -> MT4Snapshot:
        """
        Connect to MetaTrader and return a carefully structured snapshot.

        Does not write to the database. Useful for verifying live data first.
        """
        started = time.perf_counter()
        self._mt4.connect()
        try:
            snapshot = self._mt4.get_snapshot()
            duration_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "MT4 inspect completed in %sms (login=%s, positions=%s, closed=%s)",
                duration_ms,
                snapshot.account.login,
                len(snapshot.open_positions),
                len(snapshot.closed_trades),
            )
            return snapshot
        finally:
            self._mt4.disconnect()

    def run(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Execute a full synchronization cycle into SQLite.

        Rules:
        - Idempotent UPSERT by (ticket, account_number)
        - Never deletes trades
        - Never overwrites journal notes / emotion / strategy fields
        - Running repeatedly must not duplicate rows
        """
        started_at = datetime.utcnow()
        started = time.perf_counter()
        account_number: Optional[int] = None

        try:
            self._mt4.connect()
            snapshot = self._mt4.get_snapshot(date_from=date_from, date_to=date_to)
            account_number = snapshot.account.login
            synced_at = datetime.utcnow()

            account = self._accounts.upsert_from_mt4(snapshot.account)
            inserted, updated = self._trades.upsert_many(
                snapshot.closed_trades,
                snapshot.account,
                synced_at=synced_at,
            )
            # Flush so counts reflect this transaction before commit.
            self._session.flush()
            total_stored = self._trades.count_by_account(account.account_number)

            duration_ms = int((time.perf_counter() - started) * 1000)
            message = (
                f"Persisted account {account.account_number} to SQLite: "
                f"{inserted} inserted, {updated} updated, "
                f"{total_stored} total stored, "
                f"{len(snapshot.open_positions)} open positions"
            )
            log = self._sync_logs.create(
                status="success",
                source=snapshot.source,
                account_number=account.account_number,
                inserted_trades=inserted,
                updated_trades=updated,
                open_positions=len(snapshot.open_positions),
                duration_ms=duration_ms,
                message=message,
                started_at=started_at,
                finished_at=datetime.utcnow(),
            )
            logger.info(message)

            return {
                "sync_log_id": log.id,
                "account_number": account.account_number,
                "balance": str(account.balance),
                "equity": str(account.equity),
                "margin": str(account.margin),
                "free_margin": str(account.free_margin),
                "inserted_trades": inserted,
                "updated_trades": updated,
                "total_trades_stored": total_stored,
                "closed_trades_seen": len(snapshot.closed_trades),
                "open_positions": len(snapshot.open_positions),
                "duration_ms": duration_ms,
                "source": snapshot.source,
                "persisted": True,
                "database": "sqlite",
                "snapshot": snapshot.model_dump(mode="json"),
            }
        except Exception as exc:
            duration_ms = int((time.perf_counter() - started) * 1000)
            self._sync_logs.create(
                status="failed",
                source=self._mt4.adapter_name,
                account_number=account_number,
                duration_ms=duration_ms,
                message="Synchronization failed — SQLite was not updated",
                error=str(exc),
                started_at=started_at,
                finished_at=datetime.utcnow(),
            )
            logger.exception("Synchronization failed")
            raise SyncError(str(exc)) from exc
        finally:
            self._mt4.disconnect()