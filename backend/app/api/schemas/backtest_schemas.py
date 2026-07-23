"""Backtest API schemas."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class CreateStrategyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)


class CreateBacktestRecordRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    side: str = Field(..., pattern="^(buy|sell)$")
    r_multiple: Optional[str] = None
    timeframe: str = Field(..., pattern="^(1m|5m|15m|30m|1h)$")
    session: str = Field(..., pattern="^(asian|london|newyork|london_ny|other)$")
    trend: str = Field(..., pattern="^(bullish|bearish|ranging)$")
    cycle: str = Field(..., pattern="^(spike|channel|trading_range)$")
    open_time: str
    notes: Optional[str] = None


class UpdateBacktestRecordRequest(CreateBacktestRecordRequest):
    """Same payload shape as create for full record updates."""
