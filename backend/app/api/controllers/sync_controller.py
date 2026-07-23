"""Sync API controller."""

from __future__ import annotations

import logging

from flask import Blueprint

from app.core.exceptions import AppError, SyncError
from app.core.responses import error_response, success_response
from app.database.session import session_scope
from app.services.sync_service import SyncService

logger = logging.getLogger(__name__)

sync_bp = Blueprint("sync", __name__)


@sync_bp.get("/inspect")
def inspect_mt4():
    """
    Connect to MT4 and return live account data carefully.

    Does not persist anything. Use this to verify the bridge before syncing.
    """
    try:
        with session_scope() as session:
            service = SyncService(session)
            snapshot = service.inspect()
        return success_response(
            data=snapshot.model_dump(mode="json"),
            message="MT4 account snapshot retrieved",
        )
    except AppError as exc:
        logger.warning("MT4 inspect failed: %s", exc.message)
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Unexpected MT4 inspect failure")
        return error_response("Failed to inspect MT4 account", error=str(exc), status=500)


@sync_bp.post("/run")
def run_sync():
    """Run an idempotent MetaTrader synchronization cycle."""
    try:
        with session_scope() as session:
            service = SyncService(session)
            result = service.run()
        return success_response(data=result, message="Synchronization completed")
    except SyncError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except AppError as exc:
        return error_response(exc.message, error=exc.code, status=400)
    except Exception as exc:
        logger.exception("Unexpected sync failure")
        return error_response("Synchronization failed", error=str(exc), status=500)