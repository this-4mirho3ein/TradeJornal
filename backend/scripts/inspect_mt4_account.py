#!/usr/bin/env python3
"""Carefully inspect MetaTrader 4 account data via MT4Client.

Usage:
  cd backend
  python scripts/inspect_mt4_account.py
  python scripts/inspect_mt4_account.py --sync
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.logging import configure_logging
from app.database.session import init_db, session_scope
from app.services.sync_service import SyncService


def _print_section(title: str) -> None:
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)


def _print_snapshot(snapshot_dict: dict) -> None:
    account = snapshot_dict["account"]
    positions = snapshot_dict["open_positions"]
    closed = snapshot_dict["closed_trades"]

    _print_section("ACCOUNT")
    rows = [
        ("Login", account["login"]),
        ("Name", account.get("name") or "-"),
        ("Server", account.get("server") or "-"),
        ("Broker", account.get("company") or "-"),
        ("Currency", account.get("currency")),
        ("Leverage", f"1:{account.get('leverage')}"),
        ("Balance", account["balance"]),
        ("Equity", account["equity"]),
        ("Margin", account.get("margin")),
        ("Free Margin", account.get("free_margin")),
        ("Margin Level", account.get("margin_level")),
        ("Floating P/L", account.get("profit")),
        ("Synced At", account.get("synced_at")),
        ("Source", snapshot_dict.get("source")),
    ]
    width = max(len(label) for label, _ in rows)
    for label, value in rows:
        print(f"  {label:<{width}}  {value}")

    _print_section(f"OPEN POSITIONS ({len(positions)})")
    if not positions:
        print("  (none)")
    else:
        for position in positions:
            print(
                "  #{ticket}  {symbol:<8}  {side:<4}  vol={volume}  "
                "open={open_price}  now={now}  "
                "sl={stop_loss}  tp={take_profit}  pnl={profit}  "
                "magic={magic_number}  {comment}".format(
                    now=position.get("current_price") or "-",
                    ticket=position["ticket"],
                    symbol=position["symbol"],
                    side=position["side"],
                    volume=position["volume"],
                    open_price=position["open_price"],
                    stop_loss=position["stop_loss"],
                    take_profit=position["take_profit"],
                    profit=position["profit"],
                    magic_number=position["magic_number"],
                    comment=position.get("comment") or "",
                )
            )

    _print_section(f"CLOSED TRADES ({len(closed)})")
    if not closed:
        print("  (none)")
    else:
        for trade in closed:
            print(
                "  #{ticket}  {symbol:<8}  {side:<4}  vol={volume}  "
                "open={open_price}  close={close_price}  "
                "pnl={profit}  {open_time} -> {close_time}  "
                "{comment}".format(**trade)
            )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect MT4 account data carefully via the Sync Service / MT4Client.",
    )
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Also persist the snapshot into SQLite (idempotent upsert).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print raw JSON instead of a human-readable report.",
    )
    args = parser.parse_args()

    configure_logging("INFO")
    init_db()

    with session_scope() as session:
        service = SyncService(session)
        if args.sync:
            result = service.run()
            snapshot = result["snapshot"]
            if args.json:
                print(json.dumps(result, indent=2, default=str))
            else:
                _print_snapshot(snapshot)
                _print_section("SYNC RESULT")
                print(f"  inserted_trades   {result['inserted_trades']}")
                print(f"  updated_trades    {result['updated_trades']}")
                print(f"  open_positions    {result['open_positions']}")
                print(f"  duration_ms       {result['duration_ms']}")
                print(f"  sync_log_id       {result['sync_log_id']}")
        else:
            snapshot_model = service.inspect()
            snapshot = snapshot_model.model_dump(mode="json")
            if args.json:
                print(json.dumps(snapshot, indent=2, default=str))
            else:
                _print_snapshot(snapshot)
                print()
                print("Tip: re-run with --sync to persist this data into SQLite.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())