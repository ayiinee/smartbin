from __future__ import annotations

import base64
import os
from typing import Any, Dict, Iterable, List, Optional, Tuple

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

        workspace = os.getenv("ROBOFLOW_WORKSPACE", "").strip()
        project = os.getenv("ROBOFLOW_PROJECT", "").strip()
        version = os.getenv("ROBOFLOW_VERSION", "").strip()
        workflow_workspace = os.getenv("ROBOFLOW_WORKFLOW_WORKSPACE", "").strip() or workspace
        self.workflow_id = os.getenv("ROBOFLOW_WORKFLOW_ID", "").strip()
        self.workflow_workspace = workflow_workspace
        self.workflow_api_url = os.getenv("ROBOFLOW_WORKFLOW_API_URL", "https://detect.roboflow.com").strip()
        self.workflow_image_input = os.getenv("ROBOFLOW_WORKFLOW_IMAGE_INPUT", "image").strip() or "image"
        self.workflow_predictions_key = os.getenv("ROBOFLOW_WORKFLOW_PREDICTIONS_KEY", "predictions").strip()
        self.workflow_output_image_key = os.getenv("ROBOFLOW_WORKFLOW_OUTPUT_IMAGE_KEY", "output_image").strip()

        if not model_id:
            model_id = os.getenv("ROBOFLOW_MODEL_ID", "").strip()

        if not model_id:
            if workspace and project and version:
                model_id = f"{workspace}/{project}/{version}"
            elif project and version:
                model_id = f"{project}/{version}"

        self.model_id = model_id or "garbage-2mxmf"

        if not self.api_key:
            raise ValueError(
                "ROBOFLOW_API_KEY is not set. Add it to .env or set the environment variable. "
                "Get your key at https://app.roboflow.com/"
            )

        self.client = InferenceHTTPClient(
            api_url=self.api_url,
            api_key=self.api_key,
        )
        self.workflow_client = None
        if self.workflow_id:
            self.workflow_client = InferenceHTTPClient(
                api_url=self.workflow_api_url,
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

    def detect_from_base64(self, b64_string: str) -> Dict[str, Any]:
        if self.workflow_id:
            clean_b64 = self._strip_base64_header(b64_string)
            return self._infer_workflow(clean_b64)
        image = self._decode_base64_image(b64_string)
        detections = self._infer_model(image)
        return {"detections": detections, "annotated_image": None}

    def detect_from_file_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        if self.workflow_id:
            b64_string = base64.b64encode(image_bytes).decode("ascii")
            return self._infer_workflow(b64_string)
        image = self._decode_image_bytes(image_bytes)
        detections = self._infer_model(image)
        return {"detections": detections, "annotated_image": None}

    def detect_from_path(self, image_path: str) -> Dict[str, Any]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        if self.workflow_id:
            with open(image_path, "rb") as handle:
                b64_string = base64.b64encode(handle.read()).decode("ascii")
            return self._infer_workflow(b64_string)
        detections = self._infer_model(image_path)
        return {"detections": detections, "annotated_image": None}

    @staticmethod
    def _strip_base64_header(b64_string: str) -> str:
        if "," in b64_string:
            return b64_string.split(",", 1)[1]
        return b64_string

    def _infer_model(self, image_input: Any) -> List[Dict[str, Any]]:
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

    def _infer_workflow(self, b64_string: str) -> Dict[str, Any]:
        if not self.workflow_workspace:
            raise ValueError("ROBOFLOW_WORKFLOW_WORKSPACE is not set.")
        if not self.workflow_client:
            raise RuntimeError("Workflow client is not initialized.")

        try:
            if hasattr(self.workflow_client, "run_workflow"):
                result = self.workflow_client.run_workflow(
                    workspace_name=self.workflow_workspace,
                    workflow_id=self.workflow_id,
                    images={self.workflow_image_input: b64_string},
                )
            elif hasattr(self.workflow_client, "infer_from_workflow"):
                result = self.workflow_client.infer_from_workflow(
                    workspace_name=self.workflow_workspace,
                    workflow_name=self.workflow_id,
                    images={self.workflow_image_input: b64_string},
                )
            else:
                raise RuntimeError("Inference SDK does not support workflow execution.")
        except Exception as exc:
            raise RuntimeError(f"Workflow inference failed: {exc}") from exc

        normalized = self._normalize_workflow_result(result)
        return normalized

    def _normalize_workflow_result(self, result: Any) -> Dict[str, Any]:
        if isinstance(result, list) and result:
            result = result[0]

        outputs = result.get("outputs") if isinstance(result, dict) else None
        candidate = outputs if outputs is not None else result

        annotated_image = self._extract_base64_image(candidate)
        if not annotated_image and self.workflow_output_image_key:
            annotated_image = self._extract_base64_image(
                result.get(self.workflow_output_image_key) if isinstance(result, dict) else None
            )
        detections = self._extract_predictions(result, self.workflow_predictions_key)

        return {
            "detections": detections,
            "annotated_image": annotated_image,
        }

    @staticmethod
    def _extract_base64_image(obj: Any) -> Optional[str]:
        if obj is None:
            return None

        if isinstance(obj, str):
            return obj

        if isinstance(obj, dict):
            if "value" in obj and isinstance(obj["value"], str):
                if obj.get("type") in {"base64", "image", "jpg", "jpeg", "png"} or obj["value"].startswith("data:"):
                    return obj["value"]
            for key in ("output_image", "annotated_image", "image", "visualization"):
                if key in obj:
                    return VisualService._extract_base64_image(obj[key])

        if isinstance(obj, list):
            for item in obj:
                found = VisualService._extract_base64_image(item)
                if found:
                    return found

        return None

    @staticmethod
    def _extract_predictions(obj: Any, preferred_key: str | None = None) -> List[Dict[str, Any]]:
        if obj is None:
            return []

        if isinstance(obj, dict):
            if preferred_key and preferred_key in obj and isinstance(obj[preferred_key], list):
                return VisualService._normalize_predictions(obj[preferred_key])
            if "predictions" in obj and isinstance(obj["predictions"], list):
                return VisualService._normalize_predictions(obj["predictions"])
            for key in ("detections", "results", "output"):
                if key in obj:
                    preds = VisualService._extract_predictions(obj[key], preferred_key)
                    if preds:
                        return preds
            for value in obj.values():
                preds = VisualService._extract_predictions(value, preferred_key)
                if preds:
                    return preds

        if isinstance(obj, list):
            for item in obj:
                preds = VisualService._extract_predictions(item, preferred_key)
                if preds:
                    return preds

        return []

    @staticmethod
    def _normalize_predictions(preds: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for pred in preds:
            if not isinstance(pred, dict):
                continue
            label = pred.get("class") or pred.get("label") or "unknown"
            confidence = float(pred.get("confidence", 0.0))
            bbox = {
                "x": float(pred.get("x", 0.0)),
                "y": float(pred.get("y", 0.0)),
                "width": float(pred.get("width", 0.0)),
                "height": float(pred.get("height", 0.0)),
            }
            normalized.append(
                {
                    "label": label,
                    "confidence": confidence,
                    "bbox": bbox,
                }
            )
        return normalized
