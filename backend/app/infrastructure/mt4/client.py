"""MT4Client facade.

Services talk only to this client. Controllers never import MetaTrader adapters.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from app.config.settings import Settings, get_settings
from app.infrastructure.mt4.adapters.demo import DemoMT4Adapter
from app.infrastructure.mt4.adapters.file_bridge import FileBridgeMT4Adapter
from app.infrastructure.mt4.dto import (
    MT4AccountInfo,
    MT4ClosedTrade,
    MT4Position,
    MT4Snapshot,
)
from app.infrastructure.mt4.protocols import MT4Adapter

logger = logging.getLogger(__name__)


class MT4Client:
    """Single entry point for all MetaTrader 4 reads."""

    def __init__(self, adapter: MT4Adapter) -> None:
        self._adapter = adapter

    @property
    def adapter_name(self) -> str:
        """Return the active adapter identifier."""
        return self._adapter.name

    def connect(self) -> None:
        """Connect to the configured MetaTrader data source."""
        logger.info("Connecting MT4Client via adapter=%s", self._adapter.name)
        self._adapter.connect()

    def disconnect(self) -> None:
        """Disconnect from MetaTrader."""
        self._adapter.disconnect()

    def is_connected(self) -> bool:
        """Return whether MetaTrader data is currently available."""
        return self._adapter.is_connected()

    def get_account(self) -> MT4AccountInfo:
        """Read account, balance, equity and margin."""
        account = self._adapter.get_account()
        logger.info(
            "Read MT4 account login=%s balance=%s equity=%s margin=%s",
            account.login,
            account.balance,
            account.equity,
            account.margin,
        )
        return account

    def get_open_positions(self) -> List[MT4Position]:
        """Read all open positions."""
        positions = self._adapter.get_open_positions()
        logger.info("Read %s open MT4 positions", len(positions))
        return positions

    def get_closed_trades(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[MT4ClosedTrade]:
        """Read closed trades from history."""
        trades = self._adapter.get_closed_trades(date_from, date_to)
        logger.info("Read %s closed MT4 trades", len(trades))
        return trades

    def get_snapshot(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> MT4Snapshot:
        """Read a full account snapshot for inspection or sync."""
        snapshot = self._adapter.get_snapshot(date_from, date_to)
        logger.info(
            "Captured MT4 snapshot source=%s positions=%s closed=%s",
            snapshot.source,
            len(snapshot.open_positions),
            len(snapshot.closed_trades),
        )
        return snapshot


def build_adapter(settings: Settings) -> MT4Adapter:
    """Construct the configured MT4 adapter implementation."""
    if settings.mt4_adapter == "bridge":
        return FileBridgeMT4Adapter(
            bridge_path=settings.mt4_bridge_path,
            stale_seconds=settings.mt4_bridge_stale_seconds,
        )
    return DemoMT4Adapter()


def create_mt4_client(settings: Optional[Settings] = None) -> MT4Client:
    """Factory used by services and CLI tools."""
    resolved = settings or get_settings()
    return MT4Client(adapter=build_adapter(resolved))