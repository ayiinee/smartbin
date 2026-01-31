from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, cors

from app.api.dashboard import dashboard_bp
from app.api.validation import validation_bp
from app.api.bins import bins_bp
from app.api.analytics import analytics_bp
from app.api.reports import reports_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # init extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # health check
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # register blueprints
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(validation_bp, url_prefix="/api/validation")
    app.register_blueprint(bins_bp, url_prefix="/api/bins")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(reports_bp, url_prefix="api/reports.py")

    return app
