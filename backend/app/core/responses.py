"""Standardized API response helpers."""

from __future__ import annotations

from typing import Any, Optional

from flask import jsonify


def success_response(
    data: Any = None,
    message: str = "OK",
    status: int = 200,
):
    """Return a standardized success JSON response."""
    return (
        jsonify(
            {
                "success": True,
                "message": message,
                "data": data,
                "error": None,
            }
        ),
        status,
    )


def error_response(
    message: str,
    error: Optional[str] = None,
    status: int = 400,
    data: Any = None,
):
    """Return a standardized error JSON response."""
    return (
        jsonify(
            {
                "success": False,
                "message": message,
                "data": data,
                "error": error or message,
            }
        ),
        status,
    )