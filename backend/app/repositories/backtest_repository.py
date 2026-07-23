"""Backtest record repository."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.backtest_record import BacktestRecord


class BacktestRepository:
    """Persistence operations for manual backtest records."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_by_strategy(
        self,
        strategy_id: int,
        *,
        limit: int = 5000,
    ) -> List[BacktestRecord]:
        statement = (
            select(BacktestRecord)
            .where(BacktestRecord.strategy_id == strategy_id)
            .order_by(BacktestRecord.open_time.desc(), BacktestRecord.id.desc())
            .limit(limit)
        )
        return list(self._session.scalars(statement).all())

    def get_by_id(
        self,
        record_id: int,
        strategy_id: Optional[int] = None,
    ) -> Optional[BacktestRecord]:
        record = self._session.get(BacktestRecord, record_id)
        if record is None:
            return None
        if strategy_id is not None and record.strategy_id != strategy_id:
            return None
        return record

    def create(
        self,
        *,
        strategy_id: int,
        symbol: str,
        side: str,
        volume: Decimal,
        open_price: Decimal,
        r_multiple: Optional[Decimal],
        timeframe: str,
        session: str,
        trend: str,
        cycle: str,
        image_path: Optional[str],
        open_time: datetime,
        notes: Optional[str],
    ) -> BacktestRecord:
        record = BacktestRecord(
            strategy_id=strategy_id,
            symbol=symbol,
            side=side,
            volume=volume,
            open_price=open_price,
            close_price=open_price,
            stop_loss=Decimal("0"),
            take_profit=Decimal("0"),
            profit=Decimal("0"),
            r_multiple=r_multiple,
            timeframe=timeframe,
            session=session,
            trend=trend,
            cycle=cycle,
            image_path=image_path,
            open_time=open_time,
            close_time=open_time,
            duration_seconds=None,
            notes=notes,
            rating=None,
        )
        self._session.add(record)
        self._session.flush()
        return record

    def update(
        self,
        record: BacktestRecord,
        *,
        symbol: str,
        side: str,
        r_multiple: Optional[Decimal],
        timeframe: str,
        session: str,
        trend: str,
        cycle: str,
        image_path: Optional[str],
        open_time: datetime,
        notes: Optional[str],
        replace_image: bool,
    ) -> BacktestRecord:
        record.symbol = symbol
        record.side = side
        record.r_multiple = r_multiple
        record.timeframe = timeframe
        record.session = session
        record.trend = trend
        record.cycle = cycle
        record.open_time = open_time
        record.close_time = open_time
        record.notes = notes
        if replace_image:
            record.image_path = image_path
        self._session.flush()
        return record

    def delete(self, record: BacktestRecord) -> None:
        self._session.delete(record)
        self._session.flush()
