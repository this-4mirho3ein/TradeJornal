"""MT4 adapter protocol definitions."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Protocol, runtime_checkable

from app.infrastructure.mt4.dto import (
    MT4AccountInfo,
    MT4ClosedTrade,
    MT4Position,
    MT4Snapshot,
)


@runtime_checkable
class MT4Adapter(Protocol):
    """Contract every MetaTrader data source must implement."""

    name: str

    def connect(self) -> None:
        """Establish or validate the connection to MetaTrader."""

    def disconnect(self) -> None:
        """Release connection resources."""

    def is_connected(self) -> bool:
        """Return whether the adapter can currently serve data."""

    def get_account(self) -> MT4AccountInfo:
        """Read account balance, equity, margin and identity."""

    def get_open_positions(self) -> List[MT4Position]:
        """Read all currently open market positions."""

    def get_closed_trades(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[MT4ClosedTrade]:
        """Read closed trades, optionally filtered by close time."""

    def get_snapshot(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> MT4Snapshot:
        """Read a full account snapshot in one call."""