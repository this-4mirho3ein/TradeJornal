"""Application exception hierarchy."""

from __future__ import annotations


class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, code: str = "app_error") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, code="not_found")


class ValidationError(AppError):
    """Raised when input validation fails."""

    def __init__(self, message: str = "Validation failed") -> None:
        super().__init__(message, code="validation_error")


class MT4ConnectionError(AppError):
    """Raised when the MetaTrader bridge cannot be reached."""

    def __init__(self, message: str = "MT4 connection failed") -> None:
        super().__init__(message, code="mt4_connection_error")


class MT4DataError(AppError):
    """Raised when MT4 payload is missing or invalid."""

    def __init__(self, message: str = "Invalid MT4 data") -> None:
        super().__init__(message, code="mt4_data_error")


class SyncError(AppError):
    """Raised when synchronization fails."""

    def __init__(self, message: str = "Synchronization failed") -> None:
        super().__init__(message, code="sync_error")