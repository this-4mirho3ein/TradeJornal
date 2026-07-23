"""File-bridge MT4 adapter.

Reads JSON files written by `TradeJournalBridge.mq4` from a shared folder.
This is the supported live path for MetaTrader 4 (no official Python API exists).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.exceptions import MT4ConnectionError, MT4DataError
from app.infrastructure.mt4.dto import (
    MT4AccountInfo,
    MT4ClosedTrade,
    MT4Position,
    MT4Snapshot,
    TradeSide,
)

logger = logging.getLogger(__name__)

ACCOUNT_FILE = "account.json"
POSITIONS_FILE = "positions.json"
HISTORY_FILE = "history.json"
HEARTBEAT_FILE = "heartbeat.json"


class FileBridgeMT4Adapter:
    """MetaTrader adapter backed by EA-exported JSON files."""

    name = "bridge"

    def __init__(
        self,
        bridge_path: Path,
        stale_seconds: int = 120,
    ) -> None:
        self._bridge_path = Path(bridge_path)
        self._stale_seconds = stale_seconds
        self._connected = False

    def connect(self) -> None:
        """Validate that the bridge directory and heartbeat are available."""
        if not self._bridge_path.exists():
            raise MT4ConnectionError(
                f"MT4 bridge path does not exist: {self._bridge_path}. "
                "Attach TradeJournalBridge.mq4 and set the export folder."
            )

        heartbeat = self._read_json(HEARTBEAT_FILE, required=False)
        if heartbeat is None:
            raise MT4ConnectionError(
                "MT4 bridge heartbeat missing. "
                "Ensure TradeJournalBridge.mq4 is running on a chart."
            )

        age = self._heartbeat_age_seconds(heartbeat)
        if age is not None and age > self._stale_seconds:
            raise MT4ConnectionError(
                f"MT4 bridge heartbeat is stale ({age:.0f}s old). "
                "Check that MetaTrader 4 is online and the EA is allowed to trade/export."
            )

        account_path = self._bridge_path / ACCOUNT_FILE
        if not account_path.exists():
            raise MT4ConnectionError(
                f"Missing {ACCOUNT_FILE} in bridge folder. "
                "Wait for the EA's first export cycle."
            )

        self._connected = True
        logger.info(
            "MT4 file bridge connected (path=%s, heartbeat_age=%ss)",
            self._bridge_path,
            f"{age:.0f}" if age is not None else "unknown",
        )

    def disconnect(self) -> None:
        """Release bridge connection state."""
        self._connected = False
        logger.info("MT4 file bridge disconnected")

    def is_connected(self) -> bool:
        """Return whether the bridge was validated recently."""
        if not self._connected:
            return False
        try:
            heartbeat = self._read_json(HEARTBEAT_FILE, required=False)
            age = self._heartbeat_age_seconds(heartbeat or {})
            return age is None or age <= self._stale_seconds
        except MT4DataError:
            return False

    def get_account(self) -> MT4AccountInfo:
        """Read account identity and margin metrics from the bridge."""
        self._ensure_connected()
        payload = self._read_json(ACCOUNT_FILE, required=True)
        assert payload is not None
        return self._parse_account(payload)

    def get_open_positions(self) -> List[MT4Position]:
        """Read open positions from the bridge."""
        self._ensure_connected()
        payload = self._read_json(POSITIONS_FILE, required=True)
        assert payload is not None
        items = payload.get("positions", payload if isinstance(payload, list) else [])
        if not isinstance(items, list):
            raise MT4DataError("positions.json must contain a list or {positions: []}")
        return [self._parse_position(item) for item in items]

    def get_closed_trades(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[MT4ClosedTrade]:
        """Read closed trades from the bridge with optional date filters."""
        self._ensure_connected()
        payload = self._read_json(HISTORY_FILE, required=True)
        assert payload is not None
        items = payload.get("trades", payload if isinstance(payload, list) else [])
        if not isinstance(items, list):
            raise MT4DataError("history.json must contain a list or {trades: []}")

        trades = [self._parse_closed_trade(item) for item in items]
        if date_from is not None:
            trades = [trade for trade in trades if trade.close_time >= date_from]
        if date_to is not None:
            trades = [trade for trade in trades if trade.close_time <= date_to]
        return trades

    def get_snapshot(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> MT4Snapshot:
        """Read a full account snapshot from bridge files."""
        return MT4Snapshot(
            account=self.get_account(),
            open_positions=self.get_open_positions(),
            closed_trades=self.get_closed_trades(date_from, date_to),
            source=self.name,
            captured_at=datetime.utcnow(),
        )

    def _ensure_connected(self) -> None:
        if not self._connected:
            self.connect()

    def _read_json(
        self,
        filename: str,
        required: bool,
    ) -> Optional[Dict[str, Any]]:
        path = self._bridge_path / filename
        if not path.exists():
            if required:
                raise MT4DataError(f"Required bridge file missing: {filename}")
            return None
        try:
            with path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
        except json.JSONDecodeError as exc:
            raise MT4DataError(f"Invalid JSON in {filename}: {exc}") from exc
        except OSError as exc:
            raise MT4ConnectionError(f"Cannot read {filename}: {exc}") from exc

        if isinstance(data, list):
            return {"items": data}
        if not isinstance(data, dict):
            raise MT4DataError(f"{filename} root must be an object or array")
        return data

    def _heartbeat_age_seconds(self, heartbeat: Dict[str, Any]) -> Optional[float]:
        raw = heartbeat.get("timestamp") or heartbeat.get("updated_at")
        if not raw:
            return None
        stamp = self._parse_datetime(raw)
        return max(0.0, (datetime.utcnow() - stamp.replace(tzinfo=None)).total_seconds())

    def _parse_account(self, payload: Dict[str, Any]) -> MT4AccountInfo:
        try:
            return MT4AccountInfo(
                login=int(payload["login"]),
                name=str(payload.get("name", "")),
                server=str(payload.get("server", "")),
                company=str(payload.get("company", "")),
                currency=str(payload.get("currency", "USD")),
                leverage=int(payload.get("leverage", 0)),
                balance=self._decimal(payload["balance"]),
                equity=self._decimal(payload["equity"]),
                margin=self._decimal(payload.get("margin", 0)),
                free_margin=self._decimal(payload.get("free_margin", 0)),
                margin_level=self._decimal(payload.get("margin_level", 0)),
                profit=self._decimal(payload.get("profit", 0)),
                credit=self._decimal(payload.get("credit", 0)),
                trade_allowed=bool(payload.get("trade_allowed", True)),
                synced_at=self._parse_datetime(
                    payload.get("synced_at") or datetime.utcnow().isoformat()
                ),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise MT4DataError(f"Invalid account payload: {exc}") from exc

    def _parse_position(self, payload: Dict[str, Any]) -> MT4Position:
        try:
            return MT4Position(
                ticket=int(payload["ticket"]),
                symbol=str(payload["symbol"]),
                side=self._parse_side(payload.get("side") or payload.get("type")),
                volume=self._decimal(payload["volume"]),
                open_price=self._decimal(payload["open_price"]),
                open_time=self._parse_datetime(payload["open_time"]),
                stop_loss=self._decimal(payload.get("stop_loss", 0)),
                take_profit=self._decimal(payload.get("take_profit", 0)),
                commission=self._decimal(payload.get("commission", 0)),
                swap=self._decimal(payload.get("swap", 0)),
                profit=self._decimal(payload.get("profit", 0)),
                magic_number=int(payload.get("magic_number", 0)),
                comment=str(payload.get("comment", "")),
                current_price=(
                    self._decimal(payload["current_price"])
                    if payload.get("current_price") is not None
                    else None
                ),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise MT4DataError(f"Invalid position payload: {exc}") from exc

    def _parse_closed_trade(self, payload: Dict[str, Any]) -> MT4ClosedTrade:
        try:
            return MT4ClosedTrade(
                ticket=int(payload["ticket"]),
                symbol=str(payload["symbol"]),
                side=self._parse_side(payload.get("side") or payload.get("type")),
                volume=self._decimal(payload["volume"]),
                open_price=self._decimal(payload["open_price"]),
                close_price=self._decimal(payload["close_price"]),
                open_time=self._parse_datetime(payload["open_time"]),
                close_time=self._parse_datetime(payload["close_time"]),
                stop_loss=self._decimal(payload.get("stop_loss", 0)),
                take_profit=self._decimal(payload.get("take_profit", 0)),
                commission=self._decimal(payload.get("commission", 0)),
                swap=self._decimal(payload.get("swap", 0)),
                profit=self._decimal(payload["profit"]),
                magic_number=int(payload.get("magic_number", 0)),
                comment=str(payload.get("comment", "")),
                balance_after_trade=(
                    self._decimal(payload["balance_after_trade"])
                    if payload.get("balance_after_trade") is not None
                    else None
                ),
                equity_after_trade=(
                    self._decimal(payload["equity_after_trade"])
                    if payload.get("equity_after_trade") is not None
                    else None
                ),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise MT4DataError(f"Invalid closed trade payload: {exc}") from exc

    @staticmethod
    def _parse_side(raw: Any) -> TradeSide:
        value = str(raw).strip().lower()
        if value in {"0", "buy", "op_buy", "long"}:
            return TradeSide.BUY
        if value in {"1", "sell", "op_sell", "short"}:
            return TradeSide.SELL
        raise MT4DataError(f"Unknown trade side: {raw}")

    @staticmethod
    def _decimal(value: Any) -> Decimal:
        return Decimal(str(value))

    @staticmethod
    def _parse_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value.replace(tzinfo=None)
        if isinstance(value, (int, float)):
            return datetime.utcfromtimestamp(value)

        text = str(value).strip()
        # MT4 TimeToStr: 2024.07.22 14:30:00
        for mt4_fmt in ("%Y.%m.%d %H:%M:%S", "%Y.%m.%d %H:%M"):
            try:
                return datetime.strptime(text, mt4_fmt)
            except ValueError:
                pass

        iso_text = text.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(iso_text)
        except ValueError as exc:
            raise MT4DataError(f"Invalid datetime: {value}") from exc
        if parsed.tzinfo is not None:
            return parsed.astimezone(timezone.utc).replace(tzinfo=None)
        return parsed