"""Trade Journal Flask application factory."""

from __future__ import annotations

import logging

from flask import Flask
from flask_cors import CORS

from app.api.controllers.accounts_controller import accounts_bp
from app.api.controllers.backtest_controller import backtest_bp, uploads_bp
from app.api.controllers.sync_controller import sync_bp
from app.config.settings import get_settings
from app.core.logging import configure_logging
from app.database.session import init_db


def create_app() -> Flask:
    """Create and configure the Flask application."""
    settings = get_settings()
    configure_logging(settings.log_level)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.secret_key
    app.config["MAX_CONTENT_LENGTH"] = settings.max_upload_bytes
    CORS(app)

    init_db()

    app.register_blueprint(accounts_bp, url_prefix="/api/v1/accounts")
    app.register_blueprint(sync_bp, url_prefix="/api/v1/sync")
    app.register_blueprint(backtest_bp, url_prefix="/api/v1/backtest")
    app.register_blueprint(uploads_bp, url_prefix="/api/v1/uploads")

    logging.getLogger(__name__).info(
        "Trade Journal API started (mt4_adapter=%s)",
        settings.mt4_adapter,
    )
    return app
