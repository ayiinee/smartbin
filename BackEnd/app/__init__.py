from __future__ import annotations

import os

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.extensions import db, migrate, cors, sock
from app.api.dashboard import dashboard_bp
from app.api.validation import validation_bp
from app.api.bins import bins_bp
from app.api.analytics import analytics_bp
from app.api.reports import reports_bp
from app.routes.ai_routes import ai_bp

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional dependency
    load_dotenv = None


def create_app() -> Flask:
    if load_dotenv:
        load_dotenv()

    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    CORS(app)
    sock.init_app(app)

    # ensure models are registered for migrations
    from app.db_models import models  # noqa: F401

    # health check
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "smartbin-api"})

    @app.errorhandler(400)
    def bad_request(err):
        return jsonify({"error": "bad_request", "message": str(err)}), 400

    @app.errorhandler(404)
    def not_found(err):
        return jsonify({"error": "not_found", "message": str(err)}), 404

    @app.errorhandler(500)
    def server_error(err):
        return jsonify({"error": "server_error", "message": str(err)}), 500

    # register blueprints
    app.register_blueprint(ai_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(validation_bp, url_prefix="/api/validation")
    app.register_blueprint(bins_bp, url_prefix="/api/bins")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    return app
