"""Backtest application service — strategies and manual records."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
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
from app.repositories.backtest_repository import BacktestRepository
from app.repositories.strategy_repository import StrategyRepository


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


def _normalize_strategy_name(name: str) -> str:
    return " ".join(name.strip().split()).casefold()


def _parse_decimal(value: Any, field: str) -> Decimal:
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, AttributeError, TypeError) as exc:
        raise ValidationError(f"Invalid number for {field}") from exc


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


class BacktestService:
    """Create strategies and persist manual backtest trade records."""

    def __init__(self, session: Session) -> None:
        self._strategies = StrategyRepository(session)
        self._records = BacktestRepository(session)
        self._storage = get_storage()

    def list_strategies(self) -> List[Dict[str, Any]]:
        strategies = self._strategies.list_all()
        payload: List[Dict[str, Any]] = []
        for strategy in strategies:
            records = self._records.list_by_strategy(strategy.id, limit=50000)
            payload.append(self._serialize_strategy(strategy, records))
        return payload

    def create_strategy(
        self,
        *,
        name: str,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        cleaned = " ".join((name or "").strip().split())
        if not cleaned:
            raise ValidationError("Strategy name is required")
        if len(cleaned) > 120:
            raise ValidationError("Strategy name must be 120 characters or fewer")

        normalized = _normalize_strategy_name(cleaned)
        existing = self._strategies.get_by_normalized_name(normalized)
        if existing is not None:
            raise ValidationError("A strategy with this name already exists")

        desc = (description or "").strip() or None
        strategy = self._strategies.create(
            name=cleaned,
            name_normalized=normalized,
            description=desc,
        )
        return self._serialize_strategy(strategy, [])

    def get_strategy(self, strategy_id: int) -> Dict[str, Any]:
        strategy = self._strategies.get_by_id(strategy_id)
        if strategy is None:
            raise NotFoundError(f"Strategy {strategy_id} not found")
        records = self._records.list_by_strategy(strategy_id, limit=50000)
        return self._serialize_strategy(strategy, records)

    def delete_strategy(self, strategy_id: int) -> None:
        strategy = self._strategies.get_by_id(strategy_id)
        if strategy is None:
            raise NotFoundError(f"Strategy {strategy_id} not found")

        records = self._records.list_by_strategy(strategy_id, limit=50000)
        image_paths = [
            record.image_path for record in records if record.image_path
        ]

        self._strategies.delete(strategy)

        for image_path in image_paths:
            self._storage.delete(image_path)

    def list_records(self, strategy_id: int, limit: int = 5000) -> List[Dict[str, Any]]:
        strategy = self._strategies.get_by_id(strategy_id)
        if strategy is None:
            raise NotFoundError(f"Strategy {strategy_id} not found")
        records = self._records.list_by_strategy(strategy_id, limit=limit)
        return [self._serialize_record(record) for record in records]

    def create_record(
        self,
        strategy_id: int,
        payload: Dict[str, Any],
        *,
        image_stream: Optional[BinaryIO] = None,
        image_filename: Optional[str] = None,
        image_content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        strategy = self._strategies.get_by_id(strategy_id)
        if strategy is None:
            raise NotFoundError(f"Strategy {strategy_id} not found")

        symbol = str(payload.get("symbol") or "").strip().upper()
        if not symbol:
            raise ValidationError("Symbol is required")

        side = str(payload.get("side") or "").strip().lower()
        if side not in {"buy", "sell"}:
            raise ValidationError("Side must be buy or sell")

        # Volume / open price are no longer collected in the form.
        volume = Decimal("0.10")
        open_price = Decimal("0")

        r_raw = payload.get("r_multiple")
        r_multiple: Optional[Decimal] = None
        if r_raw is not None and str(r_raw).strip() != "":
            r_multiple = _parse_decimal(r_raw, "r_multiple")

        timeframe = str(payload.get("timeframe") or "").strip().lower()
        if timeframe not in BACKTEST_TIMEFRAMES:
            raise ValidationError("Timeframe is required")

        session = str(payload.get("session") or "").strip().lower()
        if session not in BACKTEST_SESSIONS:
            raise ValidationError("Session is required")

        trend = str(payload.get("trend") or "").strip().lower()
        if trend not in BACKTEST_TRENDS:
            raise ValidationError("Trend is required")

        cycle = str(payload.get("cycle") or "").strip().lower()
        if cycle not in BACKTEST_CYCLES:
            raise ValidationError("Cycle is required")

        open_time = _parse_datetime(payload.get("open_time"), "open_time")
        notes = str(payload.get("notes") or "").strip() or None

        image_path: Optional[str] = None
        if image_stream is not None and image_filename:
            image_path = self._store_image(
                strategy_id=strategy_id,
                filename=image_filename,
                stream=image_stream,
                content_type=image_content_type,
            )

        record = self._records.create(
            strategy_id=strategy_id,
            symbol=symbol,
            side=side,
            volume=volume,
            open_price=open_price,
            r_multiple=r_multiple,
            timeframe=timeframe,
            session=session,
            trend=trend,
            cycle=cycle,
            image_path=image_path,
            open_time=open_time,
            notes=notes,
        )
        return self._serialize_record(record)

    def update_record(
        self,
        strategy_id: int,
        record_id: int,
        payload: Dict[str, Any],
        *,
        image_stream: Optional[BinaryIO] = None,
        image_filename: Optional[str] = None,
        image_content_type: Optional[str] = None,
        remove_image: bool = False,
    ) -> Dict[str, Any]:
        record = self._records.get_by_id(record_id, strategy_id=strategy_id)
        if record is None:
            raise NotFoundError(f"Backtest record {record_id} not found")

        symbol = str(payload.get("symbol") or "").strip().upper()
        if not symbol:
            raise ValidationError("Symbol is required")

        side = str(payload.get("side") or "").strip().lower()
        if side not in {"buy", "sell"}:
            raise ValidationError("Side must be buy or sell")

        r_raw = payload.get("r_multiple")
        r_multiple: Optional[Decimal] = None
        if r_raw is not None and str(r_raw).strip() != "":
            r_multiple = _parse_decimal(r_raw, "r_multiple")

        timeframe = str(payload.get("timeframe") or "").strip().lower()
        if timeframe not in BACKTEST_TIMEFRAMES:
            raise ValidationError("Timeframe is required")

        session = str(payload.get("session") or "").strip().lower()
        if session not in BACKTEST_SESSIONS:
            raise ValidationError("Session is required")

        trend = str(payload.get("trend") or "").strip().lower()
        if trend not in BACKTEST_TRENDS:
            raise ValidationError("Trend is required")

        cycle = str(payload.get("cycle") or "").strip().lower()
        if cycle not in BACKTEST_CYCLES:
            raise ValidationError("Cycle is required")

        open_time = _parse_datetime(payload.get("open_time"), "open_time")
        notes = str(payload.get("notes") or "").strip() or None

        previous_image = record.image_path
        replace_image = False
        next_image: Optional[str] = previous_image

        if remove_image:
            replace_image = True
            next_image = None
        elif image_stream is not None and image_filename:
            replace_image = True
            next_image = self._store_image(
                strategy_id=strategy_id,
                filename=image_filename,
                stream=image_stream,
                content_type=image_content_type,
            )

        updated = self._records.update(
            record,
            symbol=symbol,
            side=side,
            r_multiple=r_multiple,
            timeframe=timeframe,
            session=session,
            trend=trend,
            cycle=cycle,
            image_path=next_image,
            open_time=open_time,
            notes=notes,
            replace_image=replace_image,
        )

        if replace_image and previous_image and previous_image != next_image:
            self._storage.delete(previous_image)

        return self._serialize_record(updated)

    def delete_record(self, strategy_id: int, record_id: int) -> None:
        record = self._records.get_by_id(record_id, strategy_id=strategy_id)
        if record is None:
            raise NotFoundError(f"Backtest record {record_id} not found")
        image_path = record.image_path
        self._records.delete(record)
        if image_path:
            self._storage.delete(image_path)

    def _store_image(
        self,
        *,
        strategy_id: int,
        filename: str,
        stream: BinaryIO,
        content_type: Optional[str],
    ) -> str:
        from pathlib import Path

        from app.config.settings import get_settings

        settings = get_settings()
        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationError("Image must be JPG, PNG, WEBP, or GIF")
        if content_type and content_type not in ALLOWED_IMAGE_MIME:
            raise ValidationError("Invalid image content type")

        # Bound read so oversized uploads fail early.
        data = stream.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise ValidationError("Image is too large (max 8MB)")

        from io import BytesIO

        safe_name = f"{uuid4().hex}{extension}"
        folder = f"backtest/{strategy_id}"
        return self._storage.save(
            folder=folder,
            filename=safe_name,
            stream=BytesIO(data),
            content_type=content_type,
        )

    @staticmethod
    def _stats(records: List[Any]) -> Dict[str, Any]:
        count = len(records)
        if count == 0:
            return {
                "record_count": 0,
                "net_profit": "0",
                "net_r": "0",
                "win_rate": 0.0,
                "winners": 0,
                "losers": 0,
            }

        winners = 0
        losers = 0
        net_r = Decimal("0")
        for record in records:
            r_value = (
                Decimal(str(record.r_multiple))
                if record.r_multiple is not None
                else Decimal("0")
            )
            net_r += r_value
            if r_value > 0:
                winners += 1
            elif r_value < 0:
                losers += 1

        decided = winners + losers
        win_rate = (winners / decided * 100.0) if decided else 0.0
        return {
            "record_count": count,
            "net_profit": str(net_r),
            "net_r": str(net_r),
            "win_rate": round(win_rate, 1),
            "winners": winners,
            "losers": losers,
        }

    def _serialize_strategy(self, strategy, records: List[Any]) -> Dict[str, Any]:
        stats = self._stats(records)
        return {
            "id": strategy.id,
            "name": strategy.name,
            "description": strategy.description,
            "created_at": strategy.created_at.isoformat() if strategy.created_at else None,
            "updated_at": strategy.updated_at.isoformat() if strategy.updated_at else None,
            **stats,
        }

    @staticmethod
    def _serialize_record(record) -> Dict[str, Any]:
        return {
            "id": record.id,
            "strategy_id": record.strategy_id,
            "symbol": record.symbol,
            "side": record.side,
            "volume": str(record.volume),
            "open_price": str(record.open_price),
            "r_multiple": str(record.r_multiple) if record.r_multiple is not None else None,
            "timeframe": record.timeframe or "",
            "session": record.session or "",
            "trend": record.trend or "",
            "cycle": getattr(record, "cycle", "") or "",
            "image_path": record.image_path,
            "image_url": (
                f"/api/v1/uploads/{record.image_path}"
                if record.image_path
                else None
            ),
            "open_time": record.open_time.isoformat(),
            "notes": record.notes,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }
