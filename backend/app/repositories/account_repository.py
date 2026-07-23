"""Trading account repository."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.mt4.dto import MT4AccountInfo
from app.models.account import TradingAccount


class AccountRepository:
    """Persistence operations for trading accounts."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_account_number(self, account_number: int) -> Optional[TradingAccount]:
        """Fetch an account by MetaTrader login."""
        statement = select(TradingAccount).where(
            TradingAccount.account_number == account_number
        )
        return self._session.scalar(statement)

    def upsert_from_mt4(self, account: MT4AccountInfo) -> TradingAccount:
        """Insert or update an account from an MT4 snapshot."""
        existing = self.get_by_account_number(account.login)
        if existing is None:
            existing = TradingAccount(account_number=account.login)
            self._session.add(existing)

        existing.name = account.name
        existing.server = account.server
        existing.broker = account.company
        existing.currency = account.currency
        existing.leverage = account.leverage
        existing.balance = account.balance
        existing.equity = account.equity
        existing.margin = account.margin
        existing.free_margin = account.free_margin
        existing.margin_level = account.margin_level
        existing.profit = account.profit
        existing.is_active = True
        existing.last_synced_at = account.synced_at or datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        self._session.flush()
        return existing

    def list_all(self) -> List[TradingAccount]:
        """Return all trading accounts."""
        statement = select(TradingAccount).order_by(TradingAccount.account_number)
        return list(self._session.scalars(statement).all())

    def ensure_local_journal(self) -> TradingAccount:
        """Ensure a local (non-MT4) journal account exists for manual entries."""
        existing = self.get_by_account_number(0)
        if existing is not None:
            return existing

        account = TradingAccount(
            account_number=0,
            name="Local journal",
            server="local",
            broker="manual",
            currency="USD",
            leverage=0,
            is_active=True,
        )
        self._session.add(account)
        self._session.flush()
        return account

