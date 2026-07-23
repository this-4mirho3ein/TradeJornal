"""Account API schemas."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AccountResponse(BaseModel):
    """Serialized trading account."""

    id: int
    account_number: int
    name: str
    server: str
    broker: str
    currency: str
    leverage: int
    balance: str
    equity: str
    margin: str
    free_margin: str
    margin_level: str
    profit: str
    is_active: bool
    last_synced_at: Optional[str] = None


class TradeResponse(BaseModel):
    """Serialized closed trade."""

    id: int
    ticket: int
    symbol: str
    type: str
    volume: str
    open_price: str
    close_price: str
    stop_loss: str
    take_profit: str
    commission: str
    swap: str
    profit: str
    open_time: str
    close_time: str
    duration_seconds: Optional[int] = None
    magic_number: int = 0
    comment: str = ""
    account_number: int
    strategy_id: Optional[int] = None
    rating: Optional[int] = None
    emotion: Optional[str] = None
    notes: Optional[str] = None
    r_multiple: Optional[str] = None
    timeframe: Optional[str] = None
    session: Optional[str] = None
    trend: Optional[str] = None
    cycle: Optional[str] = None
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    is_manual: bool = False


class UpdateTradeEnrichmentRequest(BaseModel):
    """Trader-owned journal fields for a synced MT4 trade."""

    notes: Optional[str] = None
    r_multiple: Optional[str] = None
    timeframe: Optional[str] = Field(default=None, pattern="^(1m|5m|15m|30m|1h)?$")
    session: Optional[str] = Field(
        default=None,
        pattern="^(asian|london|newyork|london_ny|other)?$",
    )
    trend: Optional[str] = Field(default=None, pattern="^(bullish|bearish|ranging)?$")
    cycle: Optional[str] = Field(
        default=None,
        pattern="^(spike|channel|trading_range)?$",
    )


class CreateManualTradeRequest(BaseModel):
    """Manual journal trade payload."""

    symbol: str = Field(..., min_length=1, max_length=32)
    side: str = Field(..., pattern="^(buy|sell)$")
    volume: Optional[str] = None
    open_price: Optional[str] = None
    close_price: Optional[str] = None
    profit: Optional[str] = None
    open_time: str
    close_time: Optional[str] = None
    comment: Optional[str] = None
    notes: Optional[str] = None
    r_multiple: Optional[str] = None
    timeframe: Optional[str] = Field(default=None, pattern="^(1m|5m|15m|30m|1h)?$")
    session: Optional[str] = Field(
        default=None,
        pattern="^(asian|london|newyork|london_ny|other)?$",
    )
    trend: Optional[str] = Field(default=None, pattern="^(bullish|bearish|ranging)?$")
    cycle: Optional[str] = Field(
        default=None,
        pattern="^(spike|channel|trading_range)?$",
    )


class AccountListResponse(BaseModel):
    """List of accounts."""

    accounts: List[AccountResponse] = Field(default_factory=list)