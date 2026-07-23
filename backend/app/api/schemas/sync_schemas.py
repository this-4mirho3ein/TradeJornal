"""Sync API schemas."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SyncInspectResponse(BaseModel):
    """Live MT4 snapshot used for careful inspection before syncing."""

    source: str
    captured_at: str
    account: Dict[str, Any]
    open_positions: List[Any] = Field(default_factory=list)
    closed_trades: List[Any] = Field(default_factory=list)


class SyncRunResponse(BaseModel):
    """Result of a synchronization cycle."""

    sync_log_id: int
    account_number: int
    balance: str
    equity: str
    margin: str
    free_margin: str
    inserted_trades: int
    updated_trades: int
    open_positions: int
    closed_trades_seen: int
    duration_ms: int
    source: str
    snapshot: Optional[Dict[str, Any]] = None