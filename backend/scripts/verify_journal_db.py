#!/usr/bin/env python3
"""Verify journal SQLite persistence carefully.

Usage:
  cd backend
  python scripts/verify_journal_db.py
  python scripts/verify_journal_db.py --sync
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func, select

from app.config.settings import get_settings
from app.core.logging import configure_logging
from app.database.session import init_db, session_scope
from app.models.account import TradingAccount
from app.models.sync_log import SyncLog
from app.models.trade import Trade
from app.services.sync_service import SyncService


def _print_report() -> None:
    settings = get_settings()
    print("=" * 72)
    print("JOURNAL SQLITE REPORT")
    print("=" * 72)
    print(f"database_url  {settings.database_url}")
    print(f"mt4_adapter   {settings.mt4_adapter}")
    print()

    with session_scope() as session:
        accounts = list(session.scalars(select(TradingAccount)).all())
        total_trades = session.scalar(select(func.count()).select_from(Trade)) or 0
        print(f"accounts      {len(accounts)}")
        print(f"trades        {total_trades}")
        print()
        for account in accounts:
            count = session.scalar(
                select(func.count())
                .select_from(Trade)
                .where(Trade.account_number == account.account_number)
            )
            latest = session.scalar(
                select(Trade)
                .where(Trade.account_number == account.account_number)
                .order_by(Trade.close_time.desc())
                .limit(1)
            )
            print(f"account {account.account_number}")
            print(f"  broker        {account.broker}")
            print(f"  balance       {account.balance} {account.currency}")
            print(f"  equity        {account.equity}")
            print(f"  trades        {count}")
            print(f"  last_synced   {account.last_synced_at}")
            if latest:
                print(
                    f"  latest_trade  #{latest.ticket} {latest.symbol} "
                    f"{latest.profit} @ {latest.close_time}"
                )
            print()

        logs = list(
            session.scalars(
                select(SyncLog).order_by(SyncLog.started_at.desc()).limit(5)
            ).all()
        )
        print("recent sync logs")
        for log in logs:
            print(
                f"  [{log.status}] account={log.account_number} "
                f"ins={log.inserted_trades} upd={log.updated_trades} "
                f"{log.message}"
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify SQLite journal persistence")
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Run SyncService before printing the report",
    )
    args = parser.parse_args()

    configure_logging("INFO")
    # Clear settings cache so absolute DATABASE_URL from .env is used.
    get_settings.cache_clear()
    init_db()

    if args.sync:
        with session_scope() as session:
            result = SyncService(session).run()
            print()
            print("SYNC RESULT")
            print(f"  account              {result['account_number']}")
            print(f"  inserted             {result['inserted_trades']}")
            print(f"  updated              {result['updated_trades']}")
            print(f"  total_trades_stored  {result['total_trades_stored']}")
            print(f"  closed_seen          {result['closed_trades_seen']}")
            print(f"  persisted            {result['persisted']}")
            print()

    _print_report()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())