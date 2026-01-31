from datetime import datetime

from flask import Blueprint, jsonify
from sqlalchemy import func

from app.db_models.models import AnomalyData, CarbonMetric, SmartBin, WasteLog
from app.extensions import db

dashboard_bp = Blueprint("dashboard", __name__)

CATEGORY_COLORS = {
    "Organic": "#228B22",
    "Plastic": "#87CEEB",
    "Paper": "#94A3B8",
    "Metal": "#1F2937",
    "Residue": "#8B3A3A",
}

CATEGORY_WEIGHTS_KG = {
    "Organic": 3.5,
    "Plastic": 2.1,
    "Paper": 1.8,
    "Metal": 1.4,
    "Residue": 1.1,
}


def _format_kg(value):
    return f"{value:,.0f} kg"


def _format_percent(value):
    return f"{value:.0f}%"


@dashboard_bp.get("/")
def get_dashboard():
    total_bins = SmartBin.query.count()
    active_bins = SmartBin.query.filter_by(is_active=True).count()
    offline_bins = max(total_bins - active_bins, 0)

    avg_confidence = db.session.query(func.avg(WasteLog.confidence_score)).scalar()
    if avg_confidence is None:
        sorting_accuracy = 0
    else:
        normalized_conf = avg_confidence * 100 if avg_confidence <= 1 else avg_confidence
        sorting_accuracy = min(max(normalized_conf, 0), 100)

    carbon_avoided = db.session.query(func.sum(CarbonMetric.co2_reduction_value)).scalar() or 0

    logs = WasteLog.query.order_by(WasteLog.timestamp.desc()).all()
    category_totals = {}
    total_weight = 0
    for log in logs:
        weight = CATEGORY_WEIGHTS_KG.get(log.category, 1)
        category_totals[log.category] = category_totals.get(log.category, 0) + weight
        total_weight += weight

    waste_legend = []
    for category, weight in category_totals.items():
        waste_legend.append(
            {
                "label": category,
                "value": _format_kg(weight),
                "color": CATEGORY_COLORS.get(category, "#94A3B8"),
            }
        )

    impact_cards = [
        {
            "label": "Total Waste Collected",
            "value": _format_kg(total_weight),
            "trend": "+5% vs. last week",
        },
        {
            "label": "Carbon Avoided (CO2e)",
            "value": _format_kg(carbon_avoided),
            "trend": "12% reduction",
            "accent": "green",
        },
        {
            "label": "Active Bins",
            "value": f"{active_bins}/{total_bins} Online" if total_bins else "0/0 Online",
            "trend": f"{offline_bins} unit offline" if offline_bins else "All online",
        },
        {
            "label": "Sorting Accuracy",
            "value": _format_percent(sorting_accuracy),
            "trend": "Stable this week",
        },
    ]

    live_logs = WasteLog.query.order_by(WasteLog.timestamp.desc()).limit(4).all()
    live_feed = []
    for log in live_logs:
        time_label = log.timestamp.strftime("%I:%M %p") if log.timestamp else "N/A"
        confidence = log.confidence_score * 100 if log.confidence_score <= 1 else log.confidence_score
        live_feed.append(
            {
                "time": time_label,
                "location": log.bin.location_name if log.bin else "Unknown",
                "type": log.category,
                "confidence": _format_percent(confidence),
            }
        )

    alerts = []
    full_bins = SmartBin.query.filter(SmartBin.fill_level >= 90).limit(2).all()
    for bin_item in full_bins:
        alerts.append(
            {
                "type": "Bin Full",
                "location": bin_item.location_name,
                "status": f"{bin_item.fill_level}% Full",
                "tone": "full",
                "time": "Just now",
            }
        )

    offline_bins_list = SmartBin.query.filter_by(is_active=False).limit(1).all()
    for bin_item in offline_bins_list:
        alerts.append(
            {
                "type": "Bin Offline",
                "location": bin_item.location_name,
                "status": "Disconnected",
                "tone": "offline",
                "time": "Just now",
            }
        )

    anomalies = (
        AnomalyData.query.filter_by(status_verified=False)
        .order_by(AnomalyData.id.desc())
        .limit(1)
        .all()
    )
    for anomaly in anomalies:
        alerts.append(
            {
                "type": "High Anomaly",
                "location": "Inspection Queue",
                "status": anomaly.user_label or "Mixed Waste",
                "tone": "anomaly",
                "time": "Just now",
            }
        )

    return jsonify(
        {
            "generated_at": datetime.utcnow().isoformat(),
            "impact_cards": impact_cards,
            "waste_legend": waste_legend,
            "waste_total": _format_kg(total_weight),
            "live_feed": live_feed,
            "alerts": alerts,
        }
    )
