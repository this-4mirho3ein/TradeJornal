"""Trading account ORM model."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class TradingAccount(Base):
    """Persisted trading account mirrored from MetaTrader."""

    __tablename__ = "trading_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_number: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    server: Mapped[str] = mapped_column(String(120), default="")
    broker: Mapped[str] = mapped_column(String(120), default="")
    currency: Mapped[str] = mapped_column(String(16), default="USD")
    leverage: Mapped[int] = mapped_column(Integer, default=0)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    equity: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    margin: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    free_margin: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    margin_level: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    profit: Mapped[Decimal] = mapped_column(Numeric(18, 5), default=Decimal("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )