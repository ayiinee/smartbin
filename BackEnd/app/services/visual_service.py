from __future__ import annotations

import base64
import os
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from inference_sdk import InferenceHTTPClient


class VisualService:
    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> None:
        self.api_url = api_url or os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
        self.api_key = api_key or os.getenv("ROBOFLOW_API_KEY", "")
        self.model_id = model_id or os.getenv("ROBOFLOW_MODEL_ID", "garbage-2mxmf")

        if not self.api_key:
            raise ValueError(
                "ROBOFLOW_API_KEY is not set. Add it to .env or set the environment variable. "
                "Get your key at https://app.roboflow.com/"
            )

        self.client = InferenceHTTPClient(
            api_url=self.api_url,
            api_key=self.api_key,
        )

    @staticmethod
    def _decode_base64_image(b64_string: str) -> np.ndarray:
        if not b64_string:
            raise ValueError("Empty base64 image string")

        # Strip data URL header if present
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]

        try:
            image_bytes = base64.b64decode(b64_string, validate=True)
        except Exception as exc:
            raise ValueError("Invalid base64 image string") from exc

        return VisualService._decode_image_bytes(image_bytes)

    @staticmethod
    def _decode_image_bytes(image_bytes: bytes) -> np.ndarray:
        if not image_bytes:
            raise ValueError("Empty image bytes")

        data = np.frombuffer(image_bytes, dtype=np.uint8)
        image_bgr = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("Invalid image file")

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        return image_rgb

    def detect_from_base64(self, b64_string: str) -> List[Dict[str, Any]]:
        image = self._decode_base64_image(b64_string)
        return self._infer(image)

    def detect_from_file_bytes(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        image = self._decode_image_bytes(image_bytes)
        return self._infer(image)

    def detect_from_path(self, image_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        return self._infer(image_path)

    def _infer(self, image_input: Any) -> List[Dict[str, Any]]:
        try:
            result = self.client.infer(image_input, model_id=self.model_id)
        except Exception as exc:
            raise RuntimeError(f"Inference failed: {exc}") from exc

        predictions = result.get("predictions", [])
        detections: List[Dict[str, Any]] = []

        for pred in predictions:
            label = pred.get("class") or pred.get("label") or "unknown"
            confidence = float(pred.get("confidence", 0.0))

            # Common Roboflow bbox format: center x/y with width/height
            bbox = {
                "x": float(pred.get("x", 0.0)),
                "y": float(pred.get("y", 0.0)),
                "width": float(pred.get("width", 0.0)),
                "height": float(pred.get("height", 0.0)),
            }

            detections.append(
                {
                    "label": label,
                    "confidence": confidence,
                    "bbox": bbox,
                }
            )

        return detections
