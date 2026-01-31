from __future__ import annotations

import base64
import json

from flask import Blueprint, jsonify, request

from app.extensions import sock
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
            result = service.detect_from_file_bytes(image_bytes)
        else:
            b64 = _get_base64_from_request()
            if not b64:
                return jsonify({"error": "No image provided"}), 400
            result = service.detect_from_base64(b64)

        detections = result.get("detections", []) if isinstance(result, dict) else result
        annotated_image = result.get("annotated_image") if isinstance(result, dict) else None
        return jsonify({"detections": detections, "annotated_image": annotated_image})
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


@ai_bp.post("/predict/multimodal")
def predict_multimodal():
    visual_result = {
        "label": None,
        "confidence": 0.0,
        "detections": [],
        "annotated_image": None,
    }
    audio_result = {"label": None, "confidence": 0.0}
    errors: dict[str, str] = {}

    if "image" in request.files:
        image_bytes = request.files["image"].read()
        if image_bytes:
            try:
                service = VisualService()
                visual_payload = service.detect_from_file_bytes(image_bytes)
                detections = visual_payload.get("detections", [])
                annotated_image = visual_payload.get("annotated_image")
                visual_result["detections"] = detections
                visual_result["annotated_image"] = annotated_image
                if detections:
                    top = max(detections, key=lambda item: item.get("confidence", 0.0))
                    visual_result["label"] = top.get("label")
                    visual_result["confidence"] = float(top.get("confidence", 0.0))
            except Exception as exc:
                errors["visual"] = str(exc)

    if "audio" in request.files:
        audio_bytes = request.files["audio"].read()
        if audio_bytes:
            try:
                audio_service = AudioService()
                audio_payload = audio_service.predict(audio_bytes)
                audio_result["label"] = audio_payload.get("label")
                audio_result["confidence"] = float(audio_payload.get("confidence", 0.0))
            except Exception as exc:
                errors["audio"] = str(exc)

    final_label = visual_result["label"] or audio_result["label"]
    final_confidence = max(
        visual_result["confidence"] or 0.0, audio_result["confidence"] or 0.0
    )

    return jsonify(
        {
            "visual": visual_result,
            "audio": audio_result,
            "final_decision": final_label,
            "confidence_score": final_confidence,
            "annotated_image": visual_result["annotated_image"],
            "errors": errors or None,
        }
    )


@sock.route("/api/stream/visual")
def stream_visual(ws):
    service = VisualService()
    while True:
        message = ws.receive()
        if message is None:
            break
        try:
            payload = json.loads(message) if message else {}
            b64 = payload.get("image_base64") or ""
            if not b64:
                ws.send(json.dumps({"error": "No image provided"}))
                continue
            result = service.detect_from_base64(b64)
            ws.send(json.dumps(result))
        except Exception as exc:
            ws.send(json.dumps({"error": str(exc)}))
