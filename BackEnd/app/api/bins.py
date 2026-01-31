from datetime import datetime

from flask import Blueprint, jsonify
from sqlalchemy import func

from app.db_models.models import SmartBin, WasteLog
from app.extensions import db

bins_bp = Blueprint("bins", __name__)

STATUS_THRESHOLDS = {
    "full": 90,
    "maintenance": 70,
}


def _derive_status(bin_item: SmartBin) -> str:
    if not bin_item.is_active:
        return "offline"
    if bin_item.fill_level >= STATUS_THRESHOLDS["full"]:
        return "full"
    if bin_item.fill_level >= STATUS_THRESHOLDS["maintenance"]:
        return "maintenance"
    return "active"


def _format_timestamp(value: datetime | None) -> str | None:
    if not value:
        return None
    return value.strftime("%Y-%m-%d %H:%M")


def _serialize_bin(bin_item: SmartBin, last_seen: datetime | None = None) -> dict:
    return {
        "id": bin_item.id,
        "name": bin_item.location_name or f"Smartbin {bin_item.id}",
        "location_name": bin_item.location_name,
        "latitude": bin_item.latitude,
        "longitude": bin_item.longitude,
        "is_active": bin_item.is_active,
        "fill_level": bin_item.fill_level,
        "status": _derive_status(bin_item),
        "last_seen": _format_timestamp(last_seen),
    }


@bins_bp.get("/")
def list_bins():
    last_seen_subquery = (
        db.session.query(
            WasteLog.bin_id.label("bin_id"),
            func.max(WasteLog.timestamp).label("last_seen"),
        )
        .group_by(WasteLog.bin_id)
        .subquery()
    )

    rows = (
        db.session.query(SmartBin, last_seen_subquery.c.last_seen)
        .outerjoin(last_seen_subquery, SmartBin.id == last_seen_subquery.c.bin_id)
        .order_by(SmartBin.id.asc())
        .all()
    )

    payload = [_serialize_bin(bin_item, last_seen) for bin_item, last_seen in rows]
    return jsonify({"count": len(payload), "data": payload})


@bins_bp.get("/<int:bin_id>")
def get_bin(bin_id: int):
    bin_item = SmartBin.query.get(bin_id)
    if not bin_item:
        return jsonify({"error": "not_found", "message": "Smartbin not found"}), 404

    last_seen = (
        WasteLog.query.filter_by(bin_id=bin_item.id)
        .order_by(WasteLog.timestamp.desc())
        .with_entities(WasteLog.timestamp)
        .first()
    )

    return jsonify(_serialize_bin(bin_item, last_seen[0] if last_seen else None))
