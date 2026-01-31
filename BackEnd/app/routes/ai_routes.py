from __future__ import annotations

import base64

from flask import Blueprint, jsonify, request

from app.services.audio_service import AudioService
from app.services.visual_service import VisualService


ai_bp = Blueprint("ai", __name__)


def _get_base64_from_request() -> str:
    data = request.get_json(silent=True) or {}
    b64 = data.get("image_base64") or data.get("audio_base64") or ""
    return b64


@ai_bp.post("/predict/visual")
def predict_visual():
    try:
        service = VisualService()

        if "file" in request.files:
            file = request.files["file"]
            image_bytes = file.read()
            detections = service.detect_from_file_bytes(image_bytes)
        else:
            b64 = _get_base64_from_request()
            if not b64:
                return jsonify({"error": "No image provided"}), 400
            detections = service.detect_from_base64(b64)

        return jsonify({"detections": detections})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@ai_bp.post("/predict/audio")
def predict_audio():
    try:
        service = AudioService()

        if "file" in request.files:
            file = request.files["file"]
            audio_bytes = file.read()
            result = service.predict(audio_bytes)
        else:
            b64 = _get_base64_from_request()
            if not b64:
                return jsonify({"error": "No audio provided"}), 400
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            try:
                audio_bytes = base64.b64decode(b64, validate=True)
            except Exception:
                return jsonify({"error": "Invalid base64 audio"}), 400
            result = service.predict(audio_bytes)

        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400
