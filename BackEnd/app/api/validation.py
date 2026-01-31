from __future__ import annotations

import base64
import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, jsonify, request, send_from_directory

from app.db_models.models import AnomalyData, SmartBin, WasteLog
from app.extensions import db

validation_bp = Blueprint("validation", __name__)

BASE_DIR = Path(__file__).resolve().parents[2]
ANOMALY_DIR = BASE_DIR / "app" / "storage" / "anomaly_uploads"
ANOMALY_DIR.mkdir(parents=True, exist_ok=True)


def _ensure_bin(bin_id: int | None) -> SmartBin:
    if bin_id:
        bin_item = SmartBin.query.get(bin_id)
        if bin_item:
            return bin_item

    bin_item = SmartBin.query.filter_by(is_active=True).first()
    if bin_item:
        return bin_item

    bin_item = SmartBin(
        location_name="Demo Site",
        latitude=0.0,
        longitude=0.0,
        is_active=True,
        fill_level=0,
    )
    db.session.add(bin_item)
    db.session.commit()
    return bin_item


def _save_image(image_base64: str | None) -> str | None:
    if not image_base64:
        return None

    raw = image_base64
    header = ""
    if "," in image_base64:
        header, raw = image_base64.split(",", 1)

    try:
        data = base64.b64decode(raw, validate=True)
    except Exception:
        return None

    ext = "jpg"
    if "image/png" in header:
        ext = "png"
    elif "image/webp" in header:
        ext = "webp"

    filename = f"crowd_{uuid4().hex}.{ext}"
    file_path = ANOMALY_DIR / filename
    file_path.write_bytes(data)
    return filename


def _format_confidence(value: float | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _item_status(anomaly: AnomalyData, ai_label: str | None) -> str:
    if not anomaly.status_verified:
        return "pending"
    if anomaly.user_label and ai_label and anomaly.user_label != ai_label:
        return "rejected"
    return "confirmed"


def _serialize_item(anomaly: AnomalyData, log: WasteLog | None, bin_item: SmartBin | None) -> dict:
    ai_label = log.category if log else None
    status = _item_status(anomaly, ai_label)
    resolved_type = anomaly.user_label if anomaly.status_verified else ""

    filename = None
    if anomaly.image_path:
        filename = os.path.basename(anomaly.image_path)

    return {
        "id": anomaly.id,
        "ai_label": ai_label,
        "ai_confidence": _format_confidence(log.confidence_score) if log else None,
        "crowd_label": anomaly.user_label,
        "status": status,
        "resolved_type": resolved_type,
        "bin_name": bin_item.location_name if bin_item else "Unknown",
        "location": bin_item.location_name if bin_item else "Unknown",
        "timestamp": (log.timestamp.isoformat() if log and log.timestamp else datetime.utcnow().isoformat()),
        "image_url": f"/api/validation/image/{filename}" if filename else None,
    }


@validation_bp.get("/queue")
def get_validation_queue():
    rows = (
        db.session.query(AnomalyData, WasteLog, SmartBin)
        .outerjoin(WasteLog, AnomalyData.waste_log_id == WasteLog.id)
        .outerjoin(SmartBin, WasteLog.bin_id == SmartBin.id)
        .order_by(AnomalyData.id.desc())
        .all()
    )

    items = [_serialize_item(anomaly, log, bin_item) for anomaly, log, bin_item in rows]
    return jsonify({"items": items})


@validation_bp.post("/queue")
def create_validation_queue_item():
    payload = request.get_json(silent=True) or {}
    ai_label = payload.get("ai_label") or "Unknown"
    ai_confidence = payload.get("ai_confidence") or 0
    crowd_label = payload.get("crowd_label") or ai_label
    bin_id = payload.get("bin_id")
    audio_confidence = payload.get("audio_confidence")

    bin_item = _ensure_bin(bin_id)
    image_filename = _save_image(payload.get("image_base64"))

    try:
        log = WasteLog(
            bin_id=bin_item.id,
            category=ai_label,
            confidence_score=float(ai_confidence),
            visual_conf=float(ai_confidence) if ai_confidence is not None else None,
            audio_conf=float(audio_confidence) if audio_confidence is not None else None,
            image_path=image_filename,
        )
        db.session.add(log)
        db.session.flush()

        anomaly = AnomalyData(
            waste_log_id=log.id,
            image_path=image_filename,
            user_label=crowd_label,
            status_verified=False,
        )
        db.session.add(anomaly)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": "validation_create_failed", "message": str(exc)}), 400

    return jsonify(_serialize_item(anomaly, log, bin_item)), 201


@validation_bp.patch("/queue/<int:anomaly_id>")
def resolve_validation_queue_item(anomaly_id: int):
    payload = request.get_json(silent=True) or {}
    resolved_type = payload.get("resolved_type")
    action = payload.get("action")

    anomaly = AnomalyData.query.get(anomaly_id)
    if not anomaly:
        return jsonify({"error": "not_found", "message": "Validation item not found"}), 404

    log = WasteLog.query.get(anomaly.waste_log_id) if anomaly.waste_log_id else None
    ai_label = log.category if log else None

    if action == "confirm" and not resolved_type:
        resolved_type = ai_label or anomaly.user_label

    if resolved_type:
        anomaly.user_label = resolved_type

    anomaly.status_verified = True

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": "validation_update_failed", "message": str(exc)}), 400

    bin_item = SmartBin.query.get(log.bin_id) if log else None
    return jsonify(_serialize_item(anomaly, log, bin_item))


@validation_bp.get("/image/<path:filename>")
def get_validation_image(filename: str):
    return send_from_directory(ANOMALY_DIR, filename, as_attachment=False)
