from __future__ import annotations

import io
import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import numpy as np
import cv2
from fastapi import Depends, FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import PredictionLog, TrashLog, get_db, init_db
from .audio_service import get_audio_service
from .visual_service import get_visual_service
from .fusion_service import get_fusion_service
from .config import VISUAL_WEIGHT, AUDIO_WEIGHT, CAMERA_INDEX, CAMERA_BACKEND

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(title="AudioDetectionBottle Realtime API", version="1.0.0")

# Allow local dev from file:// or localhost pages.
# Adjust for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


_camera_lock = threading.Lock()
_camera = None
_camera_index = None


def _backend_id() -> int:
    if CAMERA_BACKEND == "DSHOW":
        return cv2.CAP_DSHOW
    if CAMERA_BACKEND == "MSMF":
        return cv2.CAP_MSMF
    return cv2.CAP_ANY


def _open_camera(index: int) -> Optional[cv2.VideoCapture]:
    backend = _backend_id()
    cam = cv2.VideoCapture(index, backend)
    if cam.isOpened():
        return cam
    cam.release()
    # Fallback: try alternate backends if default failed
    for alt in (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY):
        if alt == backend:
            continue
        cam = cv2.VideoCapture(index, alt)
        if cam.isOpened():
            return cam
        cam.release()
    return None


def _get_camera(index: int = CAMERA_INDEX):
    global _camera
    global _camera_index
    with _camera_lock:
        if _camera is None:
            # Prefer default laptop camera (index 0). Fall back to others if needed.
            candidates = []
            if isinstance(index, int) and index >= 0:
                candidates.append(index)
            if 0 not in candidates:
                candidates.insert(0, 0)
            for alt in (1, 2, 3):
                if alt not in candidates:
                    candidates.append(alt)

            cam = None
            for idx in candidates:
                cam = _open_camera(idx)
                if cam is not None:
                    _camera_index = idx
                    break
            if cam is None:
                return None
            _camera = cam
        return _camera


def _read_camera_frame() -> Optional[np.ndarray]:
    cam = _get_camera()
    if cam is None:
        return None
    ok, frame = cam.read()
    if not ok:
        # Reset camera and retry once to recover from transient errors
        global _camera
        with _camera_lock:
            try:
                cam.release()
            except Exception:
                pass
            _camera = None
            global _camera_index
            _camera_index = None
        cam = _get_camera()
        if cam is None:
            return None
        ok, frame = cam.read()
        if not ok:
            return None
    return frame


def _encode_jpeg(frame: np.ndarray) -> Optional[bytes]:
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok:
        return None
    return buf.tobytes()


def _draw_predictions(frame: np.ndarray, visual_result: dict) -> None:
    predictions = visual_result.get("predictions", []) or []
    if not predictions:
        return

    frame_h, frame_w = frame.shape[:2]
    src_w = visual_result.get("image_width")
    src_h = visual_result.get("image_height")
    if src_w and src_h and (src_w != frame_w or src_h != frame_h):
        scale_x = frame_w / float(src_w)
        scale_y = frame_h / float(src_h)
    else:
        scale_x = 1.0
        scale_y = 1.0

    for pred in predictions:
        conf = float(pred.get("confidence", 0.0) or 0.0)
        if conf <= 0:
            continue
        label = f"{pred.get('class', 'object')} {conf:.2f}"

        x = pred.get("x")
        y = pred.get("y")
        w = pred.get("width")
        h = pred.get("height")
        x1 = pred.get("x1")
        y1 = pred.get("y1")
        x2 = pred.get("x2")
        y2 = pred.get("y2")

        if x is not None and y is not None and w is not None and h is not None:
            # Handle normalized coordinates (0-1) if provided
            if 0 < float(w) <= 1 and 0 < float(h) <= 1:
                x = float(x) * (src_w or frame_w)
                y = float(y) * (src_h or frame_h)
                w = float(w) * (src_w or frame_w)
                h = float(h) * (src_h or frame_h)
            x1 = int((float(x) - float(w) / 2) * scale_x)
            y1 = int((float(y) - float(h) / 2) * scale_y)
            x2 = int((float(x) + float(w) / 2) * scale_x)
            y2 = int((float(y) + float(h) / 2) * scale_y)
        elif None not in (x1, y1, x2, y2):
            # Handle normalized corners
            if 0 <= float(x2) <= 1 and 0 <= float(y2) <= 1:
                x1 = float(x1) * (src_w or frame_w)
                y1 = float(y1) * (src_h or frame_h)
                x2 = float(x2) * (src_w or frame_w)
                y2 = float(y2) * (src_h or frame_h)
            x1 = int(float(x1) * scale_x)
            y1 = int(float(y1) * scale_y)
            x2 = int(float(x2) * scale_x)
            y2 = int(float(y2) * scale_y)
        else:
            continue

        x1 = max(0, min(frame_w - 1, x1))
        y1 = max(0, min(frame_h - 1, y1))
        x2 = max(0, min(frame_w - 1, x2))
        y2 = max(0, min(frame_h - 1, y2))

        color = (0, 255, 0)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        text_y = max(0, y1 - 10)
        cv2.rectangle(frame, (x1, max(0, text_y - th - 6)), (x1 + tw + 6, text_y), color, -1)
        cv2.putText(
            frame,
            label,
            (x1 + 3, max(0, text_y - 4)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            2,
        )


@app.on_event("startup")
def startup() -> None:
    init_db()
    get_audio_service()


@app.get("/")
def root():
    """Serve the detection UI (index.html). Open http://localhost:8000/ to use the app."""
    p = FRONTEND_DIR / "index.html"
    if not p.is_file():
        raise HTTPException(status_code=500, detail="Frontend not found. Ensure frontend/index.html exists.")
    return FileResponse(p, media_type="text/html")


@app.get("/index.html")
def index_html():
    return FileResponse(FRONTEND_DIR / "index.html", media_type="text/html")


@app.get("/av.html")
def av_html():
    return FileResponse(FRONTEND_DIR / "index.html", media_type="text/html")


@app.get("/audio.html")
def audio_html():
    return FileResponse(FRONTEND_DIR / "audio.html", media_type="text/html")


@app.get("/visual.html")
def visual_html():
    return FileResponse(FRONTEND_DIR / "visual.html", media_type="text/html")


@app.get("/dashboard.html")
def dashboard_html():
    return FileResponse(FRONTEND_DIR / "dashboard.html", media_type="text/html")


@app.get("/api")
def api_info() -> dict[str, Any]:
    """API info and links. Use /docs for interactive API documentation."""
    return {
        "app": "AudioDetectionBottle API",
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "predict": "POST /predict-audio or POST /predict",
            "stats": "GET /api/stats",
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict-audio")
@app.post("/predict")
async def predict_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Accept an uploaded audio blob and return prediction JSON.
    Uses a Keras/TensorFlow MFCC model. Each detection is persisted to the
    database for the statistics dashboard.

    Input: multipart/form-data with field name "file"
    Output: {"label": "plastic"|"metal"|"glass", "confidence_score": float, "elapsed_ms": int, ...}
    """
    t0 = time.perf_counter()

    if not file:
        raise HTTPException(status_code=400, detail="No file provided.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    audio_service = get_audio_service()
    try:
        audio_result = audio_service.predict_bytes(
            audio_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    label = audio_result.get("label")
    confidence_score = float(audio_result.get("confidence_score", 0.0))
    probabilities = audio_result.get("probabilities", {})

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    # Persist to DB for stats dashboard
    log = PredictionLog(
        detected_label=label,
        confidence_score=confidence_score,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "label": label,
        "confidence_score": confidence_score,
        "elapsed_ms": elapsed_ms,
        "input_filename": file.filename,
        "input_content_type": file.content_type,
        "sr": audio_result.get("sr"),
        "num_samples": audio_result.get("num_samples"),
        "probabilities": probabilities,
    }


@app.get("/api/stats")
def api_stats(db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Aggregated statistics for the Statistics Dashboard.

    Returns:
        - total_count: total number of detections
        - distribution_by_category: { "plastic": 50, "glass": 20, ... }
        - recent_activity: last 10 prediction logs
        - peak_times: detections per hour of day (UTC) { "0": n, "1": n, ... }
    """
    total = db.query(func.count(PredictionLog.id)).scalar() or 0

    rows = (
        db.query(PredictionLog.detected_label, func.count(PredictionLog.id))
        .group_by(PredictionLog.detected_label)
        .all()
    )
    distribution_by_category = {str(r[0]): int(r[1]) for r in rows}

    recent = (
        db.query(PredictionLog)
        .order_by(PredictionLog.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_activity = [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "detected_label": r.detected_label,
            "confidence_score": r.confidence_score,
        }
        for r in recent
    ]

    hour_expr = func.strftime("%H", PredictionLog.timestamp)
    hour_rows = (
        db.query(hour_expr, func.count(PredictionLog.id))
        .group_by(hour_expr)
        .all()
    )
    peak_times = {str(h): int(c) for h, c in hour_rows}

    return {
        "total_count": total,
        "distribution_by_category": distribution_by_category,
        "recent_activity": recent_activity,
        "peak_times": peak_times,
    }


@app.get("/api/model-analysis")
def analyze_models() -> dict[str, Any]:
    """
    Analisis model audio terbaru (Keras/TensorFlow) dan label encoder.
    """
    try:
        audio_service = get_audio_service()
        model = audio_service.model
        labels = audio_service.labels

        return {
            "audio_model": {
                "input_shape": model.input_shape,
                "output_shape": model.output_shape,
                "num_params": int(model.count_params()),
            },
            "labels": labels,
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Gagal memuat model audio. Pastikan model sudah dimuat dengan benar.",
        }


@app.get("/visual/frame")
def visual_frame() -> StreamingResponse:
    """
    Return a single JPEG frame with bounding boxes from the server webcam.
    """
    frame = _read_camera_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="Camera not available.")

    visual_service = get_visual_service()
    visual_result = visual_service.predict(frame)
    _draw_predictions(frame, visual_result)

    jpeg = _encode_jpeg(frame)
    if jpeg is None:
        raise HTTPException(status_code=500, detail="Failed to encode frame.")
    return StreamingResponse(io.BytesIO(jpeg), media_type="image/jpeg")


@app.get("/visual/stream")
def visual_stream() -> StreamingResponse:
    """
    MJPEG stream with bounding boxes from the server webcam.
    """

    def generator():
        while True:
            frame = _read_camera_frame()
            if frame is None:
                break
            visual_service = get_visual_service()
            visual_result = visual_service.predict(frame)
            _draw_predictions(frame, visual_result)

            jpeg = _encode_jpeg(frame)
            if jpeg is None:
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + jpeg
                + b"\r\n"
            )

    return StreamingResponse(
        generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/api/trash-logs")
def get_trash_logs(limit: int = 50, db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Return recent TrashLogs for the live dashboard.
    """
    limit = max(1, min(int(limit), 200))
    rows = (
        db.query(TrashLog)
        .order_by(TrashLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return {
        "count": len(rows),
        "items": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "visual_label": r.visual_label,
                "audio_label": r.audio_label,
                "final_decision": r.final_decision,
                "confidence_score": r.confidence_score,
                "visual_weight_70": r.visual_weight_70,
                "audio_weight_30": r.audio_weight_30,
            }
            for r in rows
        ],
    }


@app.post("/predict-multimodal")
async def predict_multimodal(
    visual_file: Optional[UploadFile] = File(None, alias="visual_file"),
    audio_file: Optional[UploadFile] = File(None, alias="audio_file"),
    image: Optional[UploadFile] = File(None, alias="image"),
    audio: Optional[UploadFile] = File(None, alias="audio"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    SmartBin AI - Weighted Probability Fusion Endpoint
    
    Combines Visual Recognition (YOLOv8 via Roboflow) and Audio Classification
    using weighted probability fusion:
    - Audio Weight: 70% (0.7)
    - Visual Weight: 30% (0.3)
    
    Accepts:
    - image: Image file (JPEG, PNG, etc.) - optional but recommended
    - audio: Audio file (WAV, WebM, etc.) - optional
    
    Returns:
    {
        "trash_type": str,  # Final fused prediction
        "confidence": float,  # Final fused confidence
        "probabilities": Dict[str, float],  # All trash type probabilities
        "visual_result": {...},  # Visual prediction details
        "audio_result": {...},  # Audio prediction details
        "fusion_details": {...},  # Fusion weights and contributions
        "elapsed_ms": int
    }
    """
    t0 = time.perf_counter()

    image = visual_file or image
    audio = audio_file or audio

    print(
        "[predict_multimodal] Received Request",
        {"has_image": bool(image), "has_audio": bool(audio)},
    )

    if not image and not audio:
        raise HTTPException(
            status_code=400,
            detail="At least one of 'image' or 'audio' must be provided.",
        )
    
    # Get services
    fusion_service = get_fusion_service()
    visual_result = {
        "class_probabilities": {},
        "top_class": None,
        "top_confidence": 0.0,
        "input_provided": bool(image),
    }
    audio_result = {
        "label": None,
        "confidence_score": 0.0,
        "probabilities": {},
        "input_provided": bool(audio),
    }
    
    # Process image if provided
    if image:
        try:
            visual_service = get_visual_service()
            visual_result = await visual_service.predict_image(image)
            visual_result["input_provided"] = True
        except Exception as e:
            visual_result["error"] = str(e)
    print(f"[predict_multimodal] Visual Result: {visual_result}")
    
    # Process audio if provided
    if audio:
        audio_bytes = await audio.read()
        if audio_bytes:
            try:
                audio_service = get_audio_service()
                audio_result = audio_service.predict_bytes(
                    audio_bytes,
                    filename=audio.filename,
                    content_type=audio.content_type,
                )
            except Exception as e:
                audio_result["error"] = str(e)
    print(f"[predict_multimodal] Audio Result: {audio_result}")
    
    # Fuse predictions
    fused_result = fusion_service.fuse(visual_result, audio_result)
    print(f"[predict_multimodal] Final: {fused_result}")
    
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    
    # Persist to database
    log = PredictionLog(
        detected_label=fused_result["trash_type"],
        confidence_score=fused_result["confidence"],
        trash_type=fused_result["trash_type"],
        fusion_confidence=fused_result["confidence"],
        visual_class=visual_result.get("top_class"),
        visual_confidence=visual_result.get("top_confidence", 0.0),
        audio_label=audio_result.get("label"),
        audio_confidence=audio_result.get("confidence_score", 0.0),
        has_image=1 if image else 0,
        has_audio=1 if audio else 0,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return {
        "trash_type": fused_result["trash_type"],
        "confidence": fused_result["confidence"],
        "probabilities": fused_result["probabilities"],
        "visual_result": {
            "top_class": visual_result.get("top_class"),
            "top_confidence": visual_result.get("top_confidence", 0.0),
            "class_probabilities": visual_result.get("class_probabilities", {}),
            "predictions": visual_result.get("predictions", []),
            "error": visual_result.get("error"),
        },
        "audio_result": {
            "label": audio_result.get("label"),
            "confidence_score": audio_result.get("confidence_score", 0.0),
            "probabilities": audio_result.get("probabilities", {}),
            "error": audio_result.get("error"),
        },
        "fusion_details": fused_result["fusion_details"],
        "elapsed_ms": elapsed_ms,
        "weights": {
            "visual": VISUAL_WEIGHT,
            "audio": AUDIO_WEIGHT,
        },
        "effective_weights": {
            "visual": fused_result["fusion_details"].get("effective_visual_weight"),
            "audio": fused_result["fusion_details"].get("effective_audio_weight"),
        },
    }


@app.post("/predict-visual")
async def predict_visual(
    visual_file: Optional[UploadFile] = File(None, alias="visual_file"),
    image: Optional[UploadFile] = File(None, alias="image"),
) -> dict[str, Any]:
    """
    Visual-only inference endpoint for live bounding boxes without fusion or DB logging.
    """
    t0 = time.perf_counter()
    image = visual_file or image
    if not image:
        raise HTTPException(status_code=400, detail="Image file is required.")

    visual_service = get_visual_service()
    visual_result = await visual_service.predict_image(image)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "predictions": visual_result.get("predictions", []),
        "top_class": visual_result.get("top_class"),
        "top_confidence": visual_result.get("top_confidence", 0.0),
        "class_probabilities": visual_result.get("class_probabilities", {}),
        "error": visual_result.get("error"),
        "elapsed_ms": elapsed_ms,
    }


@app.post("/api/live-detect")
async def live_detect(
    visual_file: Optional[UploadFile] = File(None, alias="visual_file"),
    audio_file: Optional[UploadFile] = File(None, alias="audio_file"),
    image: Optional[UploadFile] = File(None, alias="image"),
    audio: Optional[UploadFile] = File(None, alias="audio"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Live multimodal detection for hands-free dashboard.
    Accepts image + audio, fuses results, and logs to TrashLogs.
    """
    t0 = time.perf_counter()

    image = visual_file or image
    audio = audio_file or audio

    if not image or not audio:
        raise HTTPException(
            status_code=400,
            detail="Both 'image' and 'audio' are required.",
        )

    image_bytes = await image.read()
    audio_bytes = await audio.read()
    if not image_bytes or not audio_bytes:
        raise HTTPException(status_code=400, detail="Image or audio payload is empty.")

    # Visual inference via Roboflow
    visual_result = {
        "class_probabilities": {},
        "top_class": None,
        "top_confidence": 0.0,
        "input_provided": True,
    }
    try:
        visual_service = get_visual_service()
        visual_result = visual_service.predict(image_bytes)
    except Exception as e:
        visual_result["error"] = str(e)

    visual_label = visual_result.get("top_class") or "unknown"
    visual_conf = float(visual_result.get("top_confidence", 0.0) or 0.0)

    # Audio inference (Keras/TensorFlow)
    audio_result = {
        "label": None,
        "confidence_score": 0.0,
        "probabilities": {},
        "input_provided": True,
    }
    try:
        audio_service = get_audio_service()
        audio_result = audio_service.predict_bytes(
            audio_bytes,
            filename=audio.filename,
            content_type=audio.content_type,
        )
    except Exception as e:
        audio_result["error"] = str(e)

    audio_label = audio_result.get("label") or "unknown"
    audio_conf = float(audio_result.get("confidence_score", 0.0))

    # Fusion
    fusion_service = get_fusion_service()
    fused = fusion_service.fuse(visual_result, audio_result)
    final_decision = fused["trash_type"]

    # Final confidence score per spec
    final_score = (visual_conf * VISUAL_WEIGHT) + (audio_conf * AUDIO_WEIGHT)

    # Persist to TrashLogs
    log = TrashLog(
        visual_label=visual_label,
        audio_label=audio_label,
        final_decision=final_decision,
        confidence_score=final_score,
        visual_weight_70=VISUAL_WEIGHT,
        audio_weight_30=AUDIO_WEIGHT,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "id": log.id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "visual_label": visual_label,
        "visual_confidence": visual_conf,
        "visual_predictions": visual_result.get("predictions", []),
        "audio_label": audio_label,
        "audio_confidence": audio_conf,
        "final_decision": final_decision,
        "confidence_score": float(final_score),
        "visual_weight_70": VISUAL_WEIGHT,
        "audio_weight_30": AUDIO_WEIGHT,
        "fusion_details": fused.get("fusion_details"),
        "elapsed_ms": elapsed_ms,
    }


@app.post("/api/live-detect-server")
async def live_detect_server(
    audio_file: Optional[UploadFile] = File(None, alias="audio_file"),
    audio: Optional[UploadFile] = File(None, alias="audio"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Live multimodal detection using server webcam + optional client audio.
    """
    t0 = time.perf_counter()

    audio = audio_file or audio

    frame = _read_camera_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="Camera not available.")

    # Visual inference via Roboflow on server webcam
    visual_result = {
        "class_probabilities": {},
        "top_class": None,
        "top_confidence": 0.0,
        "input_provided": True,
    }
    try:
        visual_service = get_visual_service()
        visual_result = visual_service.predict(frame)
    except Exception as e:
        visual_result["error"] = str(e)

    visual_label = visual_result.get("top_class") or "unknown"
    visual_conf = float(visual_result.get("top_confidence", 0.0) or 0.0)

    # Audio inference (optional)
    audio_result = {
        "label": None,
        "confidence_score": 0.0,
        "probabilities": {},
        "input_provided": bool(audio),
    }
    audio_label = audio_result.get("label") or "unknown"
    audio_conf = 0.0
    if audio:
        audio_bytes = await audio.read()
        if audio_bytes:
            try:
                audio_service = get_audio_service()
                audio_result = audio_service.predict_bytes(
                    audio_bytes,
                    filename=audio.filename,
                    content_type=audio.content_type,
                )
            except Exception as e:
                audio_result["error"] = str(e)

    audio_label = audio_result.get("label") or "unknown"
    audio_conf = float(audio_result.get("confidence_score", 0.0))

    # Fusion
    fusion_service = get_fusion_service()
    fused = fusion_service.fuse(visual_result, audio_result)
    final_decision = fused["trash_type"]

    # Final confidence score per spec
    final_score = (visual_conf * VISUAL_WEIGHT) + (audio_conf * AUDIO_WEIGHT)

    # Persist to TrashLogs
    log = TrashLog(
        visual_label=visual_label,
        audio_label=audio_label,
        final_decision=final_decision,
        confidence_score=final_score,
        visual_weight_70=VISUAL_WEIGHT,
        audio_weight_30=AUDIO_WEIGHT,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "id": log.id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "visual_label": visual_label,
        "visual_confidence": visual_conf,
        "visual_predictions": visual_result.get("predictions", []),
        "audio_label": audio_label,
        "audio_confidence": audio_conf,
        "final_decision": final_decision,
        "confidence_score": float(final_score),
        "visual_weight_70": VISUAL_WEIGHT,
        "audio_weight_30": AUDIO_WEIGHT,
        "fusion_details": fused.get("fusion_details"),
        "elapsed_ms": elapsed_ms,
    }


@app.get("/api/visual-detect-server")
def visual_detect_server() -> dict[str, Any]:
    """
    Visual-only detection using server webcam (no audio, no fusion).
    Returns top class + confidence and raw predictions.
    """
    t0 = time.perf_counter()

    frame = _read_camera_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="Camera not available.")

    visual_service = get_visual_service()
    visual_result = visual_service.predict(frame)

    visual_label = visual_result.get("top_class") or "unknown"
    visual_conf = float(visual_result.get("top_confidence", 0.0) or 0.0)

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "visual_label": visual_label,
        "visual_confidence": visual_conf,
        "visual_predictions": visual_result.get("predictions", []),
        "visual_error": visual_result.get("error"),
        "elapsed_ms": elapsed_ms,
    }
