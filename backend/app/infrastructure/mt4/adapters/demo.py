"""Demo MT4 adapter with realistic sample account data.

Use this adapter to inspect the journal pipeline without a live terminal.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from app.infrastructure.mt4.dto import (
    MT4AccountInfo,
    MT4ClosedTrade,
    MT4Position,
    MT4Snapshot,
    TradeSide,
)

logger = logging.getLogger(__name__)


class DemoMT4Adapter:
    """In-memory MetaTrader source for local development and demos."""

    name = "demo"

    def __init__(self) -> None:
        self._connected = False
        now = datetime.utcnow()
        self._account = MT4AccountInfo(
            login=87654321,
            name="Demo Trader",
            server="Demo-Server",
            company="Trade Journal Demo Broker",
            currency="USD",
            leverage=500,
            balance=Decimal("10485.60"),
            equity=Decimal("10612.35"),
            margin=Decimal("420.00"),
            free_margin=Decimal("10192.35"),
            margin_level=Decimal("2526.75"),
            profit=Decimal("126.75"),
            credit=Decimal("0"),
            trade_allowed=True,
            synced_at=now,
        )
        self._positions = [
            MT4Position(
                ticket=1452001,
                symbol="EURUSD",
                side=TradeSide.BUY,
                volume=Decimal("0.20"),
                open_price=Decimal("1.08420"),
                open_time=now - timedelta(hours=3, minutes=12),
                stop_loss=Decimal("1.08000"),
                take_profit=Decimal("1.09200"),
                commission=Decimal("-1.40"),
                swap=Decimal("-0.18"),
                profit=Decimal("84.00"),
                magic_number=1001,
                comment="London Breakout",
                current_price=Decimal("1.08840"),
            ),
            MT4Position(
                ticket=1452002,
                symbol="XAUUSD",
                side=TradeSide.SELL,
                volume=Decimal("0.05"),
                open_price=Decimal("2345.60"),
                open_time=now - timedelta(hours=1, minutes=5),
                stop_loss=Decimal("2358.00"),
                take_profit=Decimal("2320.00"),
                commission=Decimal("-0.70"),
                swap=Decimal("0.00"),
                profit=Decimal("42.75"),
                magic_number=1002,
                comment="Liquidity Sweep",
                current_price=Decimal("2337.05"),
            ),
        ]
        self._closed = [
            MT4ClosedTrade(
                ticket=1451890,
                symbol="GBPUSD",
                side=TradeSide.BUY,
                volume=Decimal("0.10"),
                open_price=Decimal("1.27100"),
                close_price=Decimal("1.27640"),
                open_time=now - timedelta(days=1, hours=6),
                close_time=now - timedelta(days=1, hours=2),
                stop_loss=Decimal("1.26700"),
                take_profit=Decimal("1.27700"),
                commission=Decimal("-0.70"),
                swap=Decimal("-0.22"),
                profit=Decimal("54.00"),
                magic_number=1001,
                comment="SP2L",
                balance_after_trade=Decimal("10400.00"),
                equity_after_trade=Decimal("10400.00"),
            ),
            MT4ClosedTrade(
                ticket=1451905,
                symbol="USDJPY",
                side=TradeSide.SELL,
                volume=Decimal("0.15"),
                open_price=Decimal("157.420"),
                close_price=Decimal("157.180"),
                open_time=now - timedelta(hours=20),
                close_time=now - timedelta(hours=16),
                stop_loss=Decimal("157.800"),
                take_profit=Decimal("156.900"),
                commission=Decimal("-1.05"),
                swap=Decimal("0.10"),
                profit=Decimal("22.80"),
                magic_number=1003,
                comment="Scalping",
                balance_after_trade=Decimal("10422.80"),
                equity_after_trade=Decimal("10422.80"),
            ),
            MT4ClosedTrade(
                ticket=1451950,
                symbol="EURUSD",
                side=TradeSide.SELL,
                volume=Decimal("0.10"),
                open_price=Decimal("1.08610"),
                close_price=Decimal("1.08790"),
                open_time=now - timedelta(hours=10),
                close_time=now - timedelta(hours=8),
                stop_loss=Decimal("1.08850"),
                take_profit=Decimal("1.08200"),
                commission=Decimal("-0.70"),
                swap=Decimal("0.00"),
                profit=Decimal("-18.00"),
                magic_number=1001,
                comment="News",
                balance_after_trade=Decimal("10404.10"),
                equity_after_trade=Decimal("10404.10"),
            ),
        ]

    def connect(self) -> None:
        """Mark the demo adapter as connected."""
        self._connected = True
        self._account.synced_at = datetime.utcnow()
        logger.info("Demo MT4 adapter connected (login=%s)", self._account.login)

    def disconnect(self) -> None:
        """Mark the demo adapter as disconnected."""
        self._connected = False
        logger.info("Demo MT4 adapter disconnected")

    def is_connected(self) -> bool:
        """Return connection state."""
        return self._connected

    def get_account(self) -> MT4AccountInfo:
        """Return the demo account snapshot."""
        self._ensure_connected()
        self._account.synced_at = datetime.utcnow()
        return self._account.model_copy(deep=True)

    def get_open_positions(self) -> List[MT4Position]:
        """Return demo open positions."""
        self._ensure_connected()
        return [position.model_copy(deep=True) for position in self._positions]

    def get_closed_trades(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[MT4ClosedTrade]:
        """Return demo closed trades filtered by close time."""
        self._ensure_connected()
        trades = self._closed
        if date_from is not None:
            trades = [trade for trade in trades if trade.close_time >= date_from]
        if date_to is not None:
            trades = [trade for trade in trades if trade.close_time <= date_to]
        return [trade.model_copy(deep=True) for trade in trades]

    def get_snapshot(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> MT4Snapshot:
        """Return a full demo snapshot."""
        return MT4Snapshot(
            account=self.get_account(),
            open_positions=self.get_open_positions(),
            closed_trades=self.get_closed_trades(date_from, date_to),
            source=self.name,
            captured_at=datetime.utcnow(),
        )

    def _ensure_connected(self) -> None:
        if not self._connected:
            self.connect()