"""Idempotent SQLite schema upgrades for the journal database."""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# Additive upgrades only — never drop user journal data.
_REQUIRED_TRADE_COLUMNS = {
    "mt4_synced_at": "DATETIME",
    "strategy_id": "INTEGER",
    "session_id": "INTEGER",
    "rating": "INTEGER",
    "mistake": "VARCHAR(255)",
    "lesson": "TEXT",
    "emotion": "VARCHAR(64)",
    "confidence": "INTEGER",
    "entry_reason": "TEXT",
    "exit_reason": "TEXT",
    "notes": "TEXT",
    "r_multiple": "NUMERIC(18, 4)",
    "timeframe": "VARCHAR(16)",
    "session": "VARCHAR(32)",
    "trend": "VARCHAR(32)",
    "cycle": "VARCHAR(32)",
    "image_path": "VARCHAR(512)",
}

_REQUIRED_BACKTEST_COLUMNS = {
    "session": "VARCHAR(32)",
    "trend": "VARCHAR(32)",
    "cycle": "VARCHAR(32)",
    "image_path": "VARCHAR(512)",
}

_INDEX_STATEMENTS = (
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_trades_ticket_account "
    "ON trades (ticket, account_number)",
    "CREATE INDEX IF NOT EXISTS ix_trades_account_close_time "
    "ON trades (account_number, close_time DESC)",
    "CREATE INDEX IF NOT EXISTS ix_trades_account_symbol "
    "ON trades (account_number, symbol)",
    "CREATE INDEX IF NOT EXISTS ix_trades_account_profit "
    "ON trades (account_number, profit)",
    "CREATE INDEX IF NOT EXISTS ix_trading_accounts_account_number "
    "ON trading_accounts (account_number)",
    "CREATE INDEX IF NOT EXISTS ix_sync_logs_started_at "
    "ON sync_logs (started_at DESC)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_strategies_name_normalized "
    "ON strategies (name_normalized)",
    "CREATE INDEX IF NOT EXISTS ix_backtest_records_strategy_open "
    "ON backtest_records (strategy_id, open_time DESC)",
    "CREATE INDEX IF NOT EXISTS ix_backtest_records_strategy_symbol "
    "ON backtest_records (strategy_id, symbol)",
)


def _add_missing_columns(
    connection,
    table_name: str,
    required_columns: dict[str, str],
) -> None:
    existing_columns = {
        row[1]
        for row in connection.execute(text(f"PRAGMA table_info({table_name})"))
    }
    for column_name, column_type in required_columns.items():
        if column_name in existing_columns:
            continue
        connection.execute(
            text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        )
        logger.info("Added %s.%s column", table_name, column_name)


def ensure_sqlite_journal_schema(engine: Engine) -> None:
    """
    Ensure SQLite journal durability settings, columns, and indexes.

    Safe to run on every startup. Never deletes rows.
    """
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        connection.execute(text("PRAGMA journal_mode=WAL"))
        connection.execute(text("PRAGMA synchronous=NORMAL"))
        connection.execute(text("PRAGMA temp_store=MEMORY"))
        connection.execute(text("PRAGMA foreign_keys=ON"))

        existing_tables = {
            row[0]
            for row in connection.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
        }

        if "trades" in existing_tables:
            _add_missing_columns(connection, "trades", _REQUIRED_TRADE_COLUMNS)

        if "backtest_records" in existing_tables:
            _add_missing_columns(
                connection,
                "backtest_records",
                _REQUIRED_BACKTEST_COLUMNS,
            )

        for statement in _INDEX_STATEMENTS:
            connection.execute(text(statement))

    logger.info("SQLite journal schema verified")
