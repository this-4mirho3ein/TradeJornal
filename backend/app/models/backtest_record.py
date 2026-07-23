"""Manual backtest trade records belonging to a strategy."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

# Valid values for session / trend dropdowns.
BACKTEST_SESSIONS = (
    "asian",
    "london",
    "newyork",
    "london_ny",
    "other",
)
BACKTEST_TRENDS = (
    "bullish",
    "bearish",
    "ranging",
)
BACKTEST_TIMEFRAMES = (
    "1m",
    "5m",
    "15m",
    "30m",
    "1h",
)
BACKTEST_CYCLES = (
    "spike",
    "channel",
    "trading_range",
)


class BacktestRecord(Base):
    """One manually logged backtest trade for a strategy."""

    __tablename__ = "backtest_records"
    __table_args__ = (
        Index("ix_backtest_records_strategy_open", "strategy_id", "open_time"),
        Index("ix_backtest_records_strategy_symbol", "strategy_id", "symbol"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    strategy_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("strategies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    side: Mapped[str] = mapped_column(String(16), nullable=False)  # buy | sell
    volume: Mapped[Decimal] = mapped_column(Numeric(18, 5), nullable=False)
    open_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    # Legacy columns kept for existing rows — form no longer collects them.
    close_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))
    stop_loss: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))
    take_profit: Mapped[Decimal] = mapped_column(Numeric(18, 8), default=Decimal("0"))
    profit: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    r_multiple: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    timeframe: Mapped[str] = mapped_column(String(16), default="")
    session: Mapped[str] = mapped_column(String(32), default="")
    trend: Mapped[str] = mapped_column(String(32), default="")
    cycle: Mapped[str] = mapped_column(String(32), default="")
    image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    open_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    close_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    strategy = relationship("Strategy", back_populates="backtest_records")
