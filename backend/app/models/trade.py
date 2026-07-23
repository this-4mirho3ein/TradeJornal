"""Trade ORM model combining MT4 fields and journal fields."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


# Fields owned by the trader. Sync must never overwrite these.
JOURNAL_FIELD_NAMES = (
    "strategy_id",
    "session_id",
    "rating",
    "mistake",
    "lesson",
    "emotion",
    "confidence",
    "entry_reason",
    "exit_reason",
    "notes",
    "r_multiple",
    "timeframe",
    "session",
    "trend",
    "cycle",
    "image_path",
)


class Trade(Base):
    """Closed trade record. Ticket is unique and never deleted by sync."""

    __tablename__ = "trades"
    __table_args__ = (
        UniqueConstraint("ticket", "account_number", name="uq_trades_ticket_account"),
        Index("ix_trades_account_close_time", "account_number", "close_time"),
        Index("ix_trades_account_symbol", "account_number", "symbol"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # MetaTrader fields
    ticket: Mapped[int] = mapped_column(Integer, index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    type: Mapped[str] = mapped_column(String(16))
    volume: Mapped[Decimal] = mapped_column(Numeric(18, 5))
    open_price: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    close_price: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    stop_loss: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))
    take_profit: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))
    commission: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    swap: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    profit: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    balance_after_trade: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 5),
        nullable=True,
    )
    equity_after_trade: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 5),
        nullable=True,
    )
    magic_number: Mapped[int] = mapped_column(Integer, default=0)
    comment: Mapped[str] = mapped_column(String(255), default="")
    open_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    close_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    broker: Mapped[str] = mapped_column(String(120), default="")
    server: Mapped[str] = mapped_column(String(120), default="")
    account_number: Mapped[int] = mapped_column(Integer, index=True)
    mt4_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Journal fields (filled later by the trader — preserved across sync)
    strategy_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    session_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mistake: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    lesson: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emotion: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    confidence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    entry_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    exit_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    r_multiple: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    timeframe: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    session: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    trend: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    cycle: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )