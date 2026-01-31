from flask import Blueprint, jsonify, request

from app.services.genai_reports import get_carbon_trend, get_waste_composition

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/carbon-trend")
def carbon_trend():
    days = int(request.args.get("days", 7))
    weeks = int(request.args.get("weeks", 4))
    payload = get_carbon_trend(days=days, weeks=weeks)
    return jsonify(payload)


@analytics_bp.get("/waste-composition")
def waste_composition():
    days = int(request.args.get("days", 7))
    payload = get_waste_composition(days=days)
    return jsonify(payload)
