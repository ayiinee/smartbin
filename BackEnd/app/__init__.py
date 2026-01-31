from __future__ import annotations

import os

from flask import Flask, jsonify
from flask_cors import CORS

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional dependency
    load_dotenv = None


def create_app() -> Flask:
    if load_dotenv:
        load_dotenv()

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    CORS(app)

    from app.routes.ai_routes import ai_bp

    app.register_blueprint(ai_bp, url_prefix="/api")

    @app.get("/")
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

    return app
