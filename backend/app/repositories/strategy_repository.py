"""Strategy repository."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.strategy import Strategy


class StrategyRepository:
    """Persistence operations for trading strategies."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> List[Strategy]:
        statement = select(Strategy).order_by(Strategy.created_at.desc())
        return list(self._session.scalars(statement).all())

    def get_by_id(self, strategy_id: int) -> Optional[Strategy]:
        return self._session.get(Strategy, strategy_id)

    def get_by_normalized_name(self, name_normalized: str) -> Optional[Strategy]:
        statement = select(Strategy).where(
            Strategy.name_normalized == name_normalized
        )
        return self._session.scalar(statement)

    def create(
        self,
        *,
        name: str,
        name_normalized: str,
        description: Optional[str] = None,
    ) -> Strategy:
        strategy = Strategy(
            name=name,
            name_normalized=name_normalized,
            description=description,
        )
        self._session.add(strategy)
        self._session.flush()
        return strategy

    def delete(self, strategy: Strategy) -> None:
        self._session.delete(strategy)
        self._session.flush()

    def count_records(self, strategy_id: int) -> int:
        from app.models.backtest_record import BacktestRecord

        statement = (
            select(func.count())
            .select_from(BacktestRecord)
            .where(BacktestRecord.strategy_id == strategy_id)
        )
        return int(self._session.scalar(statement) or 0)
