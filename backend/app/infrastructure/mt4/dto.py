"""Normalized MetaTrader data transfer objects."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TradeSide(str, Enum):
    """Direction of an MT4 position or closed trade."""

    BUY = "buy"
    SELL = "sell"


class MT4AccountInfo(BaseModel):
    """Live account snapshot from MetaTrader 4."""

    login: int
    name: str = ""
    server: str = ""
    company: str = ""
    currency: str = "USD"
    leverage: int = 0
    balance: Decimal
    equity: Decimal
    margin: Decimal = Decimal("0")
    free_margin: Decimal = Decimal("0")
    margin_level: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")
    trade_allowed: bool = True
    synced_at: datetime = Field(default_factory=datetime.utcnow)


class MT4Position(BaseModel):
    """Open market position from MetaTrader 4."""

    ticket: int
    symbol: str
    side: TradeSide
    volume: Decimal
    open_price: Decimal
    open_time: datetime
    stop_loss: Decimal = Decimal("0")
    take_profit: Decimal = Decimal("0")
    commission: Decimal = Decimal("0")
    swap: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")
    magic_number: int = 0
    comment: str = ""
    current_price: Optional[Decimal] = None


class MT4ClosedTrade(BaseModel):
    """Closed trade / deal from MetaTrader 4 history."""

    ticket: int
    symbol: str
    side: TradeSide
    volume: Decimal
    open_price: Decimal
    close_price: Decimal
    open_time: datetime
    close_time: datetime
    stop_loss: Decimal = Decimal("0")
    take_profit: Decimal = Decimal("0")
    commission: Decimal = Decimal("0")
    swap: Decimal = Decimal("0")
    profit: Decimal
    magic_number: int = 0
    comment: str = ""
    balance_after_trade: Optional[Decimal] = None
    equity_after_trade: Optional[Decimal] = None


class MT4Snapshot(BaseModel):
    """Full readable account snapshot for inspection and sync."""

    account: MT4AccountInfo
    open_positions: List[MT4Position] = Field(default_factory=list)
    closed_trades: List[MT4ClosedTrade] = Field(default_factory=list)
    source: str = "unknown"
    captured_at: datetime = Field(default_factory=datetime.utcnow)