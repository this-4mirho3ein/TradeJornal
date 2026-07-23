"""Account application service."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, BinaryIO, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.infrastructure.storage import get_storage
from app.models.backtest_record import (
    BACKTEST_CYCLES,
    BACKTEST_SESSIONS,
    BACKTEST_TIMEFRAMES,
    BACKTEST_TRENDS,
)
from app.repositories.account_repository import AccountRepository
from app.repositories.trade_repository import TradeRepository

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


def _parse_optional_decimal(value: Any, field: str) -> Optional[Decimal]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        return Decimal(raw)
    except (InvalidOperation, AttributeError, TypeError) as exc:
        raise ValidationError(f"Invalid number for {field}") from exc


def _parse_decimal(value: Any, field: str, *, default: Optional[Decimal] = None) -> Decimal:
    parsed = _parse_optional_decimal(value, field)
    if parsed is None:
        if default is not None:
            return default
        raise ValidationError(f"{field} is required")
    return parsed


def _parse_datetime(value: Any, field: str) -> datetime:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{field} is required")
    raw = value.strip().replace("Z", "+00:00")
    try:
        if "T" in raw and len(raw) == 16:
            return datetime.fromisoformat(raw)
        return datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError(f"Invalid datetime for {field}") from exc


def _parse_optional_enum(
    value: Any,
    *,
    field: str,
    allowed: tuple[str, ...],
) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip().lower()
    if not raw:
        return None
    if raw not in allowed:
        raise ValidationError(f"Invalid {field}")
    return raw


class AccountService:
    """Read trading accounts and their recent trades from persistence."""

    def __init__(self, session: Session) -> None:
        self._accounts = AccountRepository(session)
        self._trades = TradeRepository(session)
        self._storage = get_storage()

    def list_accounts(self) -> List[Dict[str, Any]]:
        """Return all stored trading accounts."""
        return [self._serialize_account(account) for account in self._accounts.list_all()]

    def get_account(self, account_number: int) -> Dict[str, Any]:
        """Return one trading account or raise NotFoundError."""
        account = self._accounts.get_by_account_number(account_number)
        if account is None:
            raise NotFoundError(f"Account {account_number} not found")
        return self._serialize_account(account)

    def get_account_trades(
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
    ) -> Dict[str, Any]:
        """Return filtered, paginated closed trades for an account."""
        account = self._accounts.get_by_account_number(account_number)
        if account is None:
            raise NotFoundError(f"Account {account_number} not found")

        page = max(1, int(page))
        page_size = max(1, min(int(page_size), 200))

        trades, total = self._trades.search_by_account(
            account_number,
            page=page,
            page_size=page_size,
            search=search,
            side=side,
            timeframe=timeframe,
            session=session,
            trend=trend,
            cycle=cycle,
            result=result,
        )
        total_pages = max(1, (total + page_size - 1) // page_size) if total else 1
        if page > total_pages:
            page = total_pages
            trades, total = self._trades.search_by_account(
                account_number,
                page=page,
                page_size=page_size,
                search=search,
                side=side,
                timeframe=timeframe,
                session=session,
                trend=trend,
                cycle=cycle,
                result=result,
            )

        return {
            "items": [self._serialize_trade(trade) for trade in trades],
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        }

    def resolve_journal_account(self, account_number: Optional[int] = None) -> Dict[str, Any]:
        """Return the preferred journal account, creating a local one if needed."""
        if account_number is not None:
            account = self._accounts.get_by_account_number(account_number)
            if account is None and account_number == 0:
                account = self._accounts.ensure_local_journal()
            if account is None:
                raise NotFoundError(f"Account {account_number} not found")
            return self._serialize_account(account)

        accounts = self._accounts.list_all()
        synced = [
            account
            for account in accounts
            if account.account_number != 0
        ]
        if synced:
            synced.sort(
                key=lambda item: item.last_synced_at or datetime.min,
                reverse=True,
            )
            return self._serialize_account(synced[0])

        return self._serialize_account(self._accounts.ensure_local_journal())

    def create_manual_trade(
        self,
        account_number: int,
        payload: Dict[str, Any],
        *,
        image_stream: Optional[BinaryIO] = None,
        image_filename: Optional[str] = None,
        image_content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a manual journal trade (never conflicts with MT4 tickets)."""
        if account_number == 0:
            account = self._accounts.ensure_local_journal()
        else:
            account = self._accounts.get_by_account_number(account_number)
            if account is None:
                raise NotFoundError(f"Account {account_number} not found")

        symbol = str(payload.get("symbol") or "").strip().upper()
        if not symbol:
            raise ValidationError("Symbol is required")

        side = str(payload.get("side") or "").strip().lower()
        if side not in {"buy", "sell"}:
            raise ValidationError("Side must be buy or sell")

        volume = _parse_decimal(payload.get("volume"), "volume", default=Decimal("0.01"))
        open_price = _parse_decimal(
            payload.get("open_price"),
            "open_price",
            default=Decimal("0"),
        )
        close_price = _parse_decimal(
            payload.get("close_price"),
            "close_price",
            default=open_price,
        )
        profit = _parse_decimal(payload.get("profit"), "profit", default=Decimal("0"))
        open_time = _parse_datetime(payload.get("open_time"), "open_time")
        close_time = _parse_datetime(
            payload.get("close_time") or payload.get("open_time"),
            "close_time",
        )
        if close_time < open_time:
            raise ValidationError("Close time must be after open time")

        comment = str(payload.get("comment") or "").strip()
        notes = str(payload.get("notes") or "").strip() or None
        r_multiple = _parse_optional_decimal(payload.get("r_multiple"), "r_multiple")
        timeframe = _parse_optional_enum(
            payload.get("timeframe"),
            field="timeframe",
            allowed=BACKTEST_TIMEFRAMES,
        )
        session_value = _parse_optional_enum(
            payload.get("session"),
            field="session",
            allowed=BACKTEST_SESSIONS,
        )
        trend = _parse_optional_enum(
            payload.get("trend"),
            field="trend",
            allowed=BACKTEST_TRENDS,
        )
        cycle = _parse_optional_enum(
            payload.get("cycle"),
            field="cycle",
            allowed=BACKTEST_CYCLES,
        )

        ticket = self._trades.next_manual_ticket(account.account_number)
        trade = self._trades.create_manual(
            account_number=account.account_number,
            ticket=ticket,
            symbol=symbol,
            side=side,
            volume=volume,
            open_price=open_price,
            close_price=close_price,
            profit=profit,
            open_time=open_time,
            close_time=close_time,
            comment=comment,
            notes=notes,
            r_multiple=r_multiple,
            timeframe=timeframe,
            session=session_value,
            trend=trend,
            cycle=cycle,
            image_path=None,
        )

        if image_stream is not None and image_filename:
            image_path = self._store_image(
                account_number=account.account_number,
                trade_id=trade.id,
                filename=image_filename,
                stream=image_stream,
                content_type=image_content_type,
            )
            trade.image_path = image_path

        return self._serialize_trade(trade)

    def update_trade_enrichment(
        self,
        account_number: int,
        trade_id: int,
        payload: Dict[str, Any],
        *,
        image_stream: Optional[BinaryIO] = None,
        image_filename: Optional[str] = None,
        image_content_type: Optional[str] = None,
        remove_image: bool = False,
    ) -> Dict[str, Any]:
        """Update trader-owned journal fields on a synced MT4 trade."""
        account = self._accounts.get_by_account_number(account_number)
        if account is None:
            raise NotFoundError(f"Account {account_number} not found")

        trade = self._trades.get_by_id(trade_id, account_number=account_number)
        if trade is None:
            raise NotFoundError(f"Trade {trade_id} not found")

        notes = (
            str(payload.get("notes") or "").strip() or None
            if "notes" in payload
            else trade.notes
        )

        r_multiple = (
            _parse_optional_decimal(payload.get("r_multiple"), "r_multiple")
            if "r_multiple" in payload
            else trade.r_multiple
        )
        timeframe = (
            _parse_optional_enum(
                payload.get("timeframe"),
                field="timeframe",
                allowed=BACKTEST_TIMEFRAMES,
            )
            if "timeframe" in payload
            else trade.timeframe
        )
        session_value = (
            _parse_optional_enum(
                payload.get("session"),
                field="session",
                allowed=BACKTEST_SESSIONS,
            )
            if "session" in payload
            else trade.session
        )
        trend = (
            _parse_optional_enum(
                payload.get("trend"),
                field="trend",
                allowed=BACKTEST_TRENDS,
            )
            if "trend" in payload
            else trade.trend
        )
        cycle = (
            _parse_optional_enum(
                payload.get("cycle"),
                field="cycle",
                allowed=BACKTEST_CYCLES,
            )
            if "cycle" in payload
            else trade.cycle
        )

        previous_image = trade.image_path
        replace_image = False
        next_image: Optional[str] = previous_image

        if remove_image:
            replace_image = True
            next_image = None
        elif image_stream is not None and image_filename:
            replace_image = True
            next_image = self._store_image(
                account_number=account_number,
                trade_id=trade_id,
                filename=image_filename,
                stream=image_stream,
                content_type=image_content_type,
            )

        updated = self._trades.update_enrichment(
            trade,
            notes=notes,
            r_multiple=r_multiple,
            timeframe=timeframe,
            session=session_value,
            trend=trend,
            cycle=cycle,
            image_path=next_image,
            replace_image=replace_image,
        )

        if replace_image and previous_image and previous_image != next_image:
            self._storage.delete(previous_image)

        return self._serialize_trade(updated)

    def _store_image(
        self,
        *,
        account_number: int,
        trade_id: int,
        filename: str,
        stream: BinaryIO,
        content_type: Optional[str],
    ) -> str:
        from app.config.settings import get_settings

        settings = get_settings()
        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationError("Image must be JPG, PNG, WEBP, or GIF")
        if content_type and content_type not in ALLOWED_IMAGE_MIME:
            raise ValidationError("Invalid image content type")

        data = stream.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise ValidationError("Image is too large (max 8MB)")

        safe_name = f"{uuid4().hex}{extension}"
        folder = f"trades/{account_number}/{trade_id}"
        return self._storage.save(
            folder=folder,
            filename=safe_name,
            stream=BytesIO(data),
            content_type=content_type,
        )

    @staticmethod
    def _serialize_account(account) -> Dict[str, Any]:
        return {
            "id": account.id,
            "account_number": account.account_number,
            "name": account.name,
            "server": account.server,
            "broker": account.broker,
            "currency": account.currency,
            "leverage": account.leverage,
            "balance": str(account.balance),
            "equity": str(account.equity),
            "margin": str(account.margin),
            "free_margin": str(account.free_margin),
            "margin_level": str(account.margin_level),
            "profit": str(account.profit),
            "is_active": account.is_active,
            "last_synced_at": (
                account.last_synced_at.isoformat() if account.last_synced_at else None
            ),
        }

    @staticmethod
    def _serialize_trade(trade) -> Dict[str, Any]:
        return {
            "id": trade.id,
            "ticket": trade.ticket,
            "symbol": trade.symbol,
            "type": trade.type,
            "volume": str(trade.volume),
            "open_price": str(trade.open_price),
            "close_price": str(trade.close_price),
            "stop_loss": str(trade.stop_loss),
            "take_profit": str(trade.take_profit),
            "commission": str(trade.commission),
            "swap": str(trade.swap),
            "profit": str(trade.profit),
            "open_time": trade.open_time.isoformat(),
            "close_time": trade.close_time.isoformat(),
            "duration_seconds": trade.duration_seconds,
            "magic_number": trade.magic_number,
            "comment": trade.comment,
            "account_number": trade.account_number,
            "strategy_id": trade.strategy_id,
            "rating": trade.rating,
            "emotion": trade.emotion,
            "notes": trade.notes,
            "r_multiple": (
                str(trade.r_multiple) if trade.r_multiple is not None else None
            ),
            "timeframe": trade.timeframe or None,
            "session": trade.session or None,
            "trend": trade.trend or None,
            "cycle": trade.cycle or None,
            "image_path": trade.image_path,
            "image_url": (
                f"/api/v1/uploads/{trade.image_path}" if trade.image_path else None
            ),
            "is_manual": trade.ticket < 0 or trade.magic_number == -1,
        }
