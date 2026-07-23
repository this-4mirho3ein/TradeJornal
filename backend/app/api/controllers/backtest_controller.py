"""Backtest API controller."""

from __future__ import annotations

import logging

from flask import Blueprint, request, send_file
from pydantic import ValidationError as PydanticValidationError

from app.api.schemas.backtest_schemas import (
    CreateBacktestRecordRequest,
    CreateStrategyRequest,
    UpdateBacktestRecordRequest,
)
from app.core.exceptions import AppError, NotFoundError, ValidationError
from app.core.responses import error_response, success_response
from app.database.session import session_scope
from app.infrastructure.storage import get_storage
from app.services.backtest_service import BacktestService

logger = logging.getLogger(__name__)

backtest_bp = Blueprint("backtest", __name__)
uploads_bp = Blueprint("uploads", __name__)


@backtest_bp.get("/strategies")
def list_strategies():
    """List all backtest strategies with summary stats."""
    try:
        with session_scope() as session:
            service = BacktestService(session)
            data = service.list_strategies()
        return success_response(data=data, message="Strategies retrieved")
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to list strategies")
        return error_response("Failed to list strategies", error=str(exc), status=500)


@backtest_bp.post("/strategies")
def create_strategy():
    """Create a new strategy by name."""
    try:
        body = CreateStrategyRequest.model_validate(request.get_json(silent=True) or {})
        with session_scope() as session:
            service = BacktestService(session)
            data = service.create_strategy(
                name=body.name,
                description=body.description,
            )
        return success_response(data=data, message="Strategy created", status=201)
    except PydanticValidationError as exc:
        return error_response(
            "Invalid strategy payload",
            error=str(exc.errors()),
            status=400,
        )
    except ValidationError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to create strategy")
        return error_response("Failed to create strategy", error=str(exc), status=500)


@backtest_bp.get("/strategies/<int:strategy_id>")
def get_strategy(strategy_id: int):
    """Get one strategy with summary stats."""
    try:
        with session_scope() as session:
            service = BacktestService(session)
            data = service.get_strategy(strategy_id)
        return success_response(data=data, message="Strategy retrieved")
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to get strategy %s", strategy_id)
        return error_response("Failed to get strategy", error=str(exc), status=500)


@backtest_bp.delete("/strategies/<int:strategy_id>")
def delete_strategy(strategy_id: int):
    """Delete a strategy and all of its backtest records."""
    try:
        with session_scope() as session:
            service = BacktestService(session)
            service.delete_strategy(strategy_id)
        return success_response(
            data={"id": strategy_id},
            message="Strategy deleted",
        )
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to delete strategy %s", strategy_id)
        return error_response("Failed to delete strategy", error=str(exc), status=500)


@backtest_bp.get("/strategies/<int:strategy_id>/records")
def list_records(strategy_id: int):
    """List backtest records for a strategy."""
    try:
        limit = int(request.args.get("limit", 5000))
        limit = max(0, min(limit, 50000))
        with session_scope() as session:
            service = BacktestService(session)
            data = service.list_records(strategy_id, limit=limit)
        return success_response(data=data, message="Backtest records retrieved")
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to list records for strategy %s", strategy_id)
        return error_response("Failed to list records", error=str(exc), status=500)


@backtest_bp.post("/strategies/<int:strategy_id>/records")
def create_record(strategy_id: int):
    """Manually add a backtest trade record (JSON or multipart with optional image)."""
    try:
        image_stream = None
        image_filename = None
        image_content_type = None

        if request.content_type and "multipart/form-data" in request.content_type:
            payload = {key: value for key, value in request.form.items()}
            upload = request.files.get("image")
            if upload and upload.filename:
                image_stream = upload.stream
                image_filename = upload.filename
                image_content_type = upload.mimetype
        else:
            payload = request.get_json(silent=True) or {}

        body = CreateBacktestRecordRequest.model_validate(payload)
        with session_scope() as session:
            service = BacktestService(session)
            data = service.create_record(
                strategy_id,
                body.model_dump(),
                image_stream=image_stream,
                image_filename=image_filename,
                image_content_type=image_content_type,
            )
        return success_response(data=data, message="Backtest record created", status=201)
    except PydanticValidationError as exc:
        return error_response(
            "Invalid backtest record payload",
            error=str(exc.errors()),
            status=400,
        )
    except ValidationError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to create record for strategy %s", strategy_id)
        return error_response("Failed to create record", error=str(exc), status=500)


@backtest_bp.put("/strategies/<int:strategy_id>/records/<int:record_id>")
@backtest_bp.patch("/strategies/<int:strategy_id>/records/<int:record_id>")
def update_record(strategy_id: int, record_id: int):
    """Update a backtest trade record (JSON or multipart with optional image)."""
    try:
        image_stream = None
        image_filename = None
        image_content_type = None
        remove_image = False

        if request.content_type and "multipart/form-data" in request.content_type:
            payload = {key: value for key, value in request.form.items()}
            remove_image = str(payload.pop("remove_image", "")).lower() in {
                "1",
                "true",
                "yes",
            }
            upload = request.files.get("image")
            if upload and upload.filename:
                image_stream = upload.stream
                image_filename = upload.filename
                image_content_type = upload.mimetype
        else:
            payload = request.get_json(silent=True) or {}
            remove_image = bool(payload.pop("remove_image", False))

        body = UpdateBacktestRecordRequest.model_validate(payload)
        with session_scope() as session:
            service = BacktestService(session)
            data = service.update_record(
                strategy_id,
                record_id,
                body.model_dump(),
                image_stream=image_stream,
                image_filename=image_filename,
                image_content_type=image_content_type,
                remove_image=remove_image,
            )
        return success_response(data=data, message="Backtest record updated")
    except PydanticValidationError as exc:
        return error_response(
            "Invalid backtest record payload",
            error=str(exc.errors()),
            status=400,
        )
    except ValidationError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception(
            "Failed to update record %s for strategy %s",
            record_id,
            strategy_id,
        )
        return error_response("Failed to update record", error=str(exc), status=500)


@backtest_bp.delete("/strategies/<int:strategy_id>/records/<int:record_id>")
def delete_record(strategy_id: int, record_id: int):
    """Delete one backtest record."""
    try:
        with session_scope() as session:
            service = BacktestService(session)
            service.delete_record(strategy_id, record_id)
        return success_response(data={"id": record_id}, message="Backtest record deleted")
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception(
            "Failed to delete record %s for strategy %s",
            record_id,
            strategy_id,
        )
        return error_response("Failed to delete record", error=str(exc), status=500)


@uploads_bp.get("/<path:relative_path>")
def serve_upload(relative_path: str):
    """Serve a locally stored upload by relative path (never from SQLite blobs)."""
    try:
        cleaned = relative_path.replace("\\", "/").lstrip("/")
        if ".." in cleaned.split("/"):
            return error_response("Invalid path", error="validation_error", status=400)
        storage = get_storage()
        # Support both new paths (backtest/...) and legacy (uploads/backtest/...).
        candidates = [cleaned]
        if cleaned.startswith("uploads/"):
            candidates.append(cleaned[len("uploads/") :])
        absolute = None
        from pathlib import Path

        for candidate in candidates:
            try:
                path = Path(storage.absolute_path(candidate))
            except ValueError:
                continue
            if path.is_file():
                absolute = str(path)
                break
        if absolute is None:
            return error_response("File not found", error="not_found", status=404)
        return send_file(absolute)
    except FileNotFoundError:
        return error_response("File not found", error="not_found", status=404)
    except ValueError:
        return error_response("Invalid path", error="validation_error", status=400)
    except Exception as exc:
        logger.exception("Failed to serve upload %s", relative_path)
        return error_response("Failed to serve file", error=str(exc), status=500)
