"""Trade repository with idempotent upsert semantics."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.orm import Session

from app.infrastructure.mt4.dto import MT4AccountInfo, MT4ClosedTrade
from app.models.trade import JOURNAL_FIELD_NAMES, Trade


class TradeRepository:
    """Persistence operations for closed trades."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_ticket(
        self,
        ticket: int,
        account_number: int,
    ) -> Optional[Trade]:
        """Fetch a trade by ticket within an account."""
        statement = select(Trade).where(
            Trade.ticket == ticket,
            Trade.account_number == account_number,
        )
        return self._session.scalar(statement)

    def count_by_account(self, account_number: int) -> int:
        """Return how many closed trades are stored for an account."""
        statement = (
            select(func.count())
            .select_from(Trade)
            .where(Trade.account_number == account_number)
        )
        return int(self._session.scalar(statement) or 0)

    def upsert_closed_trade(
        self,
        closed: MT4ClosedTrade,
        account: MT4AccountInfo,
        *,
        synced_at: Optional[datetime] = None,
    ) -> Tuple[Trade, bool]:
        """
        Insert or update a closed trade from MetaTrader.

        Idempotent by (ticket, account_number).
        Never deletes rows.
        Never overwrites journal fields (notes, emotion, strategy, etc.).
        """
        existing = self.get_by_ticket(closed.ticket, account.login)
        created = existing is None

        # Capture journal values before any assignment (belt and suspenders).
        preserved = {}
        if existing is not None:
            for field_name in JOURNAL_FIELD_NAMES:
                preserved[field_name] = getattr(existing, field_name)

        if existing is None:
            existing = Trade(
                ticket=closed.ticket,
                account_number=account.login,
            )
            self._session.add(existing)

        # MT4 fields only — journal fields are intentionally absent here.
        existing.symbol = closed.symbol
        existing.type = closed.side.value
        existing.volume = closed.volume
        existing.open_price = closed.open_price
        existing.close_price = closed.close_price
        existing.stop_loss = closed.stop_loss
        existing.take_profit = closed.take_profit
        existing.commission = closed.commission
        existing.swap = closed.swap
        existing.profit = closed.profit
        existing.balance_after_trade = closed.balance_after_trade
        existing.equity_after_trade = closed.equity_after_trade
        existing.magic_number = closed.magic_number
        existing.comment = closed.comment
        existing.open_time = closed.open_time
        existing.close_time = closed.close_time
        existing.duration_seconds = max(
            0,
            int((closed.close_time - closed.open_time).total_seconds()),
        )
        existing.broker = account.company
        existing.server = account.server
        existing.mt4_synced_at = synced_at or datetime.utcnow()
        existing.updated_at = datetime.utcnow()

        if not created:
            for field_name, value in preserved.items():
                setattr(existing, field_name, value)

        self._session.flush()
        return existing, created

    def upsert_many(
        self,
        closed_trades: List[MT4ClosedTrade],
        account: MT4AccountInfo,
        *,
        synced_at: Optional[datetime] = None,
    ) -> Tuple[int, int]:
        """Upsert many closed trades. Returns (inserted, updated)."""
        stamp = synced_at or datetime.utcnow()
        inserted = 0
        updated = 0
        for closed in closed_trades:
            _, created = self.upsert_closed_trade(
                closed,
                account,
                synced_at=stamp,
            )
            if created:
                inserted += 1
            else:
                updated += 1
        return inserted, updated

    def get_by_id(
        self,
        trade_id: int,
        account_number: Optional[int] = None,
    ) -> Optional[Trade]:
        trade = self._session.get(Trade, trade_id)
        if trade is None:
            return None
        if account_number is not None and trade.account_number != account_number:
            return None
        return trade

    def update_enrichment(
        self,
        trade: Trade,
        *,
        notes: Optional[str],
        r_multiple: Optional[Decimal],
        timeframe: Optional[str],
        session: Optional[str],
        trend: Optional[str],
        cycle: Optional[str],
        image_path: Optional[str],
        replace_image: bool,
    ) -> Trade:
        trade.notes = notes
        trade.r_multiple = r_multiple
        trade.timeframe = timeframe
        trade.session = session
        trade.trend = trend
        trade.cycle = cycle
        if replace_image:
            trade.image_path = image_path
        trade.updated_at = datetime.utcnow()
        self._session.flush()
        return trade

    def next_manual_ticket(self, account_number: int) -> int:
        """Allocate a unique negative ticket for manual journal entries."""
        statement = select(func.min(Trade.ticket)).where(
            Trade.account_number == account_number
        )
        minimum = self._session.scalar(statement)
        if minimum is None or minimum > -1:
            return -1
        return int(minimum) - 1

    def create_manual(
        self,
        *,
        account_number: int,
        ticket: int,
        symbol: str,
        side: str,
        volume: Decimal,
        open_price: Decimal,
        close_price: Decimal,
        profit: Decimal,
        open_time: datetime,
        close_time: datetime,
        comment: str,
        notes: Optional[str],
        r_multiple: Optional[Decimal],
        timeframe: Optional[str],
        session: Optional[str],
        trend: Optional[str],
        cycle: Optional[str],
        image_path: Optional[str],
    ) -> Trade:
        duration = max(0, int((close_time - open_time).total_seconds()))
        trade = Trade(
            ticket=ticket,
            account_number=account_number,
            symbol=symbol,
            type=side,
            volume=volume,
            open_price=open_price,
            close_price=close_price,
            stop_loss=Decimal("0"),
            take_profit=Decimal("0"),
            commission=Decimal("0"),
            swap=Decimal("0"),
            profit=profit,
            magic_number=-1,
            comment=comment,
            open_time=open_time,
            close_time=close_time,
            duration_seconds=duration,
            broker="manual",
            server="local",
            mt4_synced_at=None,
            notes=notes,
            r_multiple=r_multiple,
            timeframe=timeframe,
            session=session,
            trend=trend,
            cycle=cycle,
            image_path=image_path,
        )
        self._session.add(trade)
        self._session.flush()
        return trade

    def list_by_account(
        self,
        account_number: int,
        limit: Optional[int] = 5000,
    ) -> List[Trade]:
        """List closed trades for an account (newest first)."""
        statement = (
            select(Trade)
            .where(Trade.account_number == account_number)
            .order_by(Trade.close_time.desc())
        )
        if limit is not None and limit > 0:
            statement = statement.limit(limit)
        return list(self._session.scalars(statement).all())

    def search_by_account(
        self,
        account_number: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        side: Optional[str] = None,
        timeframe: Optional[str] = None,
        session: Optional[str] = None,
        trend: Optional[str] = None,
        cycle: Optional[str] = None,
        result: Optional[str] = None,
    ) -> Tuple[List[Trade], int]:
        """Filter and paginate closed trades for an account."""
        page = max(1, page)
        page_size = max(1, min(page_size, 200))

        conditions = [Trade.account_number == account_number]

        query = (search or "").strip()
        if query:
            pattern = f"%{query}%"
            conditions.append(
                or_(
                    Trade.symbol.ilike(pattern),
                    Trade.comment.ilike(pattern),
                    Trade.notes.ilike(pattern),
                    cast(Trade.ticket, String).like(pattern),
                )
            )

        if side in {"buy", "sell"}:
            conditions.append(func.lower(Trade.type) == side)

        if timeframe:
            conditions.append(Trade.timeframe == timeframe)
        if session:
            conditions.append(Trade.session == session)
        if trend:
            conditions.append(Trade.trend == trend)
        if cycle:
            conditions.append(Trade.cycle == cycle)

        if result == "win":
            conditions.append(Trade.profit > 0)
        elif result == "loss":
            conditions.append(Trade.profit < 0)
        elif result == "be":
            conditions.append(Trade.profit == 0)

        where_clause = and_(*conditions)
        total = int(
            self._session.scalar(
                select(func.count()).select_from(Trade).where(where_clause)
            )
            or 0
        )

        statement = (
            select(Trade)
            .where(where_clause)
            .order_by(Trade.close_time.desc(), Trade.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = list(self._session.scalars(statement).all())
        return rows, total

