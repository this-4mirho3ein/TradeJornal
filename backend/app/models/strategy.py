"""Strategy ORM model for live journaling and backtesting."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Strategy(Base):
    """Named trading strategy. Users can create unlimited strategies."""

    __tablename__ = "strategies"
    __table_args__ = (
        UniqueConstraint("name_normalized", name="uq_strategies_name_normalized"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    name_normalized: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    backtest_records = relationship(
        "BacktestRecord",
        back_populates="strategy",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
