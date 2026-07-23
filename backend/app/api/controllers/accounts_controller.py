"""Accounts API controller."""

from __future__ import annotations

import logging

from flask import Blueprint, request
from pydantic import ValidationError as PydanticValidationError

from app.api.schemas.account_schemas import (
    CreateManualTradeRequest,
    UpdateTradeEnrichmentRequest,
)
from app.core.exceptions import AppError, NotFoundError, ValidationError
from app.core.responses import error_response, success_response
from app.database.session import session_scope
from app.services.account_service import AccountService

logger = logging.getLogger(__name__)

accounts_bp = Blueprint("accounts", __name__)


@accounts_bp.get("")
def list_accounts():
    """List all synced trading accounts."""
    try:
        with session_scope() as session:
            service = AccountService(session)
            data = service.list_accounts()
        return success_response(data=data, message="Accounts retrieved")
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to list accounts")
        return error_response("Failed to list accounts", error=str(exc), status=500)


@accounts_bp.get("/<int:account_number>")
def get_account(account_number: int):
    """Get one trading account by MetaTrader login."""
    try:
        with session_scope() as session:
            service = AccountService(session)
            data = service.get_account(account_number)
        return success_response(data=data, message="Account retrieved")
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to get account %s", account_number)
        return error_response("Failed to get account", error=str(exc), status=500)


@accounts_bp.get("/<int:account_number>/trades")
def get_account_trades(account_number: int):
    """Get filtered, paginated closed trades for an account."""
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", request.args.get("limit", 20)))
        search = (request.args.get("search") or "").strip() or None
        side = (request.args.get("side") or "").strip().lower() or None
        timeframe = (request.args.get("timeframe") or "").strip().lower() or None
        session_value = (request.args.get("session") or "").strip().lower() or None
        trend = (request.args.get("trend") or "").strip().lower() or None
        cycle = (request.args.get("cycle") or "").strip().lower() or None
        result = (request.args.get("result") or "").strip().lower() or None

        if side == "all":
            side = None
        if timeframe == "all":
            timeframe = None
        if session_value == "all":
            session_value = None
        if trend == "all":
            trend = None
        if cycle == "all":
            cycle = None
        if result == "all":
            result = None

        with session_scope() as session:
            service = AccountService(session)
            data = service.get_account_trades(
                account_number,
                page=page,
                page_size=page_size,
                search=search,
                side=side,
                timeframe=timeframe,
                session=session_value,
                trend=trend,
                cycle=cycle,
                result=result,
            )
        return success_response(data=data, message="Trades retrieved")
    except NotFoundError as exc:
        return error_response(exc.message, error=exc.code, status=404)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Failed to get trades for account %s", account_number)
        return error_response("Failed to get trades", error=str(exc), status=500)



@accounts_bp.post("/<int:account_number>/trades")
def create_manual_trade(account_number: int):
    """Create a manual journal trade for an account."""
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

        body = CreateManualTradeRequest.model_validate(payload)
        with session_scope() as session:
            service = AccountService(session)
            data = service.create_manual_trade(
                account_number,
                body.model_dump(),
                image_stream=image_stream,
                image_filename=image_filename,
                image_content_type=image_content_type,
            )
        return success_response(data=data, message="Manual trade created", status=201)
    except PydanticValidationError as exc:
        return error_response(
            "Invalid manual trade payload",
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
        logger.exception("Failed to create manual trade for account %s", account_number)
        return error_response("Failed to create trade", error=str(exc), status=500)


@accounts_bp.put("/<int:account_number>/trades/<int:trade_id>")
@accounts_bp.patch("/<int:account_number>/trades/<int:trade_id>")
def update_trade_enrichment(account_number: int, trade_id: int):
    """Update journal enrichment fields on a synced closed trade."""
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

        body = UpdateTradeEnrichmentRequest.model_validate(payload)
        with session_scope() as session:
            service = AccountService(session)
            data = service.update_trade_enrichment(
                account_number,
                trade_id,
                body.model_dump(),
                image_stream=image_stream,
                image_filename=image_filename,
                image_content_type=image_content_type,
                remove_image=remove_image,
            )
        return success_response(data=data, message="Trade journal updated")
    except PydanticValidationError as exc:
        return error_response(
            "Invalid trade journal payload",
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
            "Failed to update trade %s for account %s",
            trade_id,
            account_number,
        )
        return error_response("Failed to update trade", error=str(exc), status=500)
