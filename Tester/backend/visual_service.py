"""
Visual Recognition Service using Roboflow YOLOv8 API
"""
from __future__ import annotations

import io
import os
import tempfile
import traceback
from typing import Any, Dict, Optional

import numpy as np
from fastapi import UploadFile
from PIL import Image

try:
    from inference_sdk import InferenceHTTPClient
except ImportError:
    InferenceHTTPClient = None

try:
    import requests
except ImportError:
    requests = None

from .config import (
    ROBOFLOW_API_KEY,
    ROBOFLOW_API_URL,
    ROBOFLOW_MODEL_ID,
    ROBOFLOW_WORKFLOW_ID,
    ROBOFLOW_WORKFLOW_IMAGE_INPUT,
    ROBOFLOW_WORKFLOW_PREDICTIONS_KEY,
    ROBOFLOW_WORKSPACE_NAME,
)

DEFAULT_HTTP_URL = "https://detect.roboflow.com"


class VisualRecognitionService:
    """Service for visual recognition using Roboflow Inference API."""

    def __init__(
        self,
        api_url: str = ROBOFLOW_API_URL,
        api_key: str = ROBOFLOW_API_KEY,
        model_id: str = ROBOFLOW_MODEL_ID,
        workflow_id: str = ROBOFLOW_WORKFLOW_ID,
        workspace_name: str = ROBOFLOW_WORKSPACE_NAME,
        workflow_image_input: str = ROBOFLOW_WORKFLOW_IMAGE_INPUT,
        workflow_predictions_key: str = ROBOFLOW_WORKFLOW_PREDICTIONS_KEY,
    ):
        """
        Initialize Roboflow Inference Client.

        Args:
            api_url: Roboflow API URL
            api_key: Roboflow API key
            model_id: Roboflow model ID
        """
        self.api_url = api_url or DEFAULT_HTTP_URL
        self.api_key = api_key
        self.model_id = model_id
        self.workflow_id = workflow_id
        self.workspace_name = workspace_name
        self.workflow_image_input = workflow_image_input or "image"
        self.workflow_predictions_key = workflow_predictions_key or "predictions"
        self.client = None
        self.use_workflow = bool(self.workflow_id and self.workspace_name)

        if not self.api_key or (not self.model_id and not self.use_workflow):
            raise ValueError(
                "ROBOFLOW_API_KEY / ROBOFLOW_MODEL_ID is missing "
                "(or set ROBOFLOW_WORKFLOW_ID + ROBOFLOW_WORKSPACE_NAME). "
                "Set them in env vars or backend/config.py."
            )

        if InferenceHTTPClient is not None:
            try:
                if hasattr(InferenceHTTPClient, "init"):
                    self.client = InferenceHTTPClient.init(
                        api_url=self.api_url, api_key=self.api_key
                    )
                else:
                    self.client = InferenceHTTPClient(
                        api_url=self.api_url, api_key=self.api_key
                    )
            except Exception as e:
                print(f"[visual_service] Failed to init SDK client: {e}")
                self.client = None

    def _looks_like_prediction(self, item: Any) -> bool:
        if not isinstance(item, dict):
            return False
        return any(
            k in item
            for k in (
                "confidence",
                "class",
                "label",
                "x",
                "y",
                "width",
                "height",
                "x1",
                "y1",
                "x2",
                "y2",
                "bbox",
                "box",
            )
        )

    def _find_prediction_list(self, value: Any, depth: int = 0) -> list[dict]:
        if depth > 4:
            return []
        if isinstance(value, list) and value:
            if all(self._looks_like_prediction(item) for item in value):
                return value
            for item in value:
                found = self._find_prediction_list(item, depth + 1)
                if found:
                    return found
            return []
        if isinstance(value, dict):
            for key in ("predictions", self.workflow_predictions_key):
                if key in value:
                    found = self._find_prediction_list(value[key], depth + 1)
                    if found:
                        return found
            for nested in value.values():
                found = self._find_prediction_list(nested, depth + 1)
                if found:
                    return found
        return []

    def _extract_workflow_predictions(self, workflow_output: Any) -> list[dict]:
        return self._find_prediction_list(workflow_output)

    def _infer_with_workflow(self, image: Any) -> Dict[str, Any]:
        if self.client is None:
            raise RuntimeError("SDK client not available")
        if not self.workflow_id or not self.workspace_name:
            raise RuntimeError("Workflow configuration is missing")

        images = {self.workflow_image_input: image}
        try:
            if hasattr(self.client, "run_workflow"):
                workflow_result = self.client.run_workflow(
                    workspace_name=self.workspace_name,
                    workflow_id=self.workflow_id,
                    images=images,
                )
            else:
                workflow_result = self.client.infer_from_workflow(
                    workspace_name=self.workspace_name,
                    workflow_name=self.workflow_id,
                    images=images,
                )
        except TypeError:
            workflow_result = self.client.infer_from_workflow(
                workspace_name=self.workspace_name,
                workflow_name=self.workflow_id,
                images=images,
            )

        if isinstance(workflow_result, list) and workflow_result:
            first_output = workflow_result[0]
        else:
            first_output = workflow_result

        predictions = self._extract_workflow_predictions(first_output)
        image_info = {}
        if isinstance(first_output, dict):
            image_info = first_output.get("image") or {}
        parsed = self._parse_predictions(
            {
                "predictions": predictions,
                "workflow_output": first_output,
                "image": image_info,
                "image_width": image_info.get("width"),
                "image_height": image_info.get("height"),
            }
        )
        parsed["workflow_output"] = first_output
        parsed["workflow_response"] = workflow_result
        return parsed

    def _infer_with_http(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Fallback to Roboflow Hosted Inference API (detect.roboflow.com).
        """
        if requests is None:
            raise ImportError("requests not installed. Install with: pip install requests")
        if not self.model_id:
            raise RuntimeError("ROBOFLOW_MODEL_ID is required for HTTP fallback")

        url = f"{DEFAULT_HTTP_URL}/{self.model_id}"
        try:
            resp = requests.post(
                url,
                params={"api_key": self.api_key},
                files={"file": ("image.jpg", image_bytes, "image/jpeg")},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[visual_service] Roboflow HTTP infer failed: {e}")
            traceback.print_exc()
            return {
                "error": str(e),
                "predictions": [],
                "top_class": None,
                "top_confidence": 0.0,
                "class_probabilities": {},
            }

    @staticmethod
    def _image_to_jpeg_bytes(image: Image.Image) -> bytes:
        bio = io.BytesIO()
        image.save(bio, format="JPEG")
        return bio.getvalue()

    def _infer_with_pil(self, image: Image.Image) -> Dict[str, Any]:
        """
        Safely run inference using a PIL image by saving to a temp file first.
        This avoids passing raw UploadFile bytes directly to the SDK.
        """
        tmp_path = None
        jpeg_bytes = None
        try:
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")
            if self.client is not None:
                if self.use_workflow:
                    return self._infer_with_workflow(image)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                    tmp_path = tmp.name
                    image.save(tmp_path, format="JPEG")
                result = self.client.infer(tmp_path, model_id=self.model_id)
            else:
                if self.use_workflow and not self.model_id:
                    raise RuntimeError(
                        "Workflow mode requires inference_sdk client; "
                        "install inference-sdk and set ROBOFLOW_API_KEY."
                    )
                jpeg_bytes = self._image_to_jpeg_bytes(image)
                result = self._infer_with_http(jpeg_bytes)
        except Exception as e:
            print(f"[visual_service] Roboflow infer failed: {e}")
            traceback.print_exc()
            if jpeg_bytes is None:
                try:
                    jpeg_bytes = self._image_to_jpeg_bytes(image)
                except Exception:
                    jpeg_bytes = None
            if jpeg_bytes is not None:
                return self._infer_with_http(jpeg_bytes)
            return {
                "error": str(e),
                "predictions": [],
                "top_class": None,
                "top_confidence": 0.0,
                "class_probabilities": {},
            }
        finally:
            if tmp_path and os.path.isfile(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
        return self._parse_predictions(result)

    def _infer_with_ndarray(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Run inference from a numpy array (e.g., OpenCV frame).
        Falls back to PIL path if the SDK rejects the ndarray.
        """
        try:
            if self.client is None:
                raise RuntimeError("SDK client not available")
            if self.use_workflow:
                return self._infer_with_workflow(image)
            result = self.client.infer(image, model_id=self.model_id)
            return self._parse_predictions(result)
        except Exception as e:
            print(f"[visual_service] Roboflow infer ndarray failed: {e}")
            traceback.print_exc()
            # Convert OpenCV BGR to RGB for PIL
            if image.ndim == 3 and image.shape[2] == 3:
                image = image[:, :, ::-1]
            pil = Image.fromarray(image)
            try:
                jpeg_bytes = self._image_to_jpeg_bytes(pil)
            except Exception:
                jpeg_bytes = None
            if jpeg_bytes is not None:
                return self._infer_with_http(jpeg_bytes)
            return self._infer_with_pil(pil)

    def _parse_predictions(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Roboflow response into a normalized structure."""
        raw_predictions = result.get("predictions", []) or []
        image_info = result.get("image") or {}
        image_width = result.get("image_width") or image_info.get("width") or result.get("width")
        image_height = result.get("image_height") or image_info.get("height") or result.get("height")

        class_probs: Dict[str, float] = {}
        top_confidence = 0.0
        top_class = None
        normalized_predictions = []

        for pred in raw_predictions:
            class_name = pred.get("class", pred.get("class_name", pred.get("label", "unknown")))
            confidence = float(pred.get("confidence", pred.get("confidence_score", 0.0)) or 0.0)
            x = pred.get("x")
            y = pred.get("y")
            width = pred.get("width")
            height = pred.get("height")
            x1 = pred.get("x1")
            y1 = pred.get("y1")
            x2 = pred.get("x2")
            y2 = pred.get("y2")

            if x is None or y is None or width is None or height is None:
                bbox = pred.get("bbox") or pred.get("box") or {}
                x = bbox.get("x", x)
                y = bbox.get("y", y)
                width = bbox.get("width", bbox.get("w", width))
                height = bbox.get("height", bbox.get("h", height))
                x1 = bbox.get("x1", bbox.get("x_min", x1))
                y1 = bbox.get("y1", bbox.get("y_min", y1))
                x2 = bbox.get("x2", bbox.get("x_max", x2))
                y2 = bbox.get("y2", bbox.get("y_max", y2))

            normalized_predictions.append(
                {
                    "class": class_name,
                    "confidence": confidence,
                    "x": x,
                    "y": y,
                    "width": width,
                    "height": height,
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "raw": pred,
                }
            )

            if class_name not in class_probs or confidence > class_probs[class_name]:
                class_probs[class_name] = confidence

            if confidence > top_confidence:
                top_confidence = confidence
                top_class = class_name

        return {
            "predictions": normalized_predictions,
            "top_class": top_class,
            "top_confidence": top_confidence,
            "class_probabilities": class_probs,
            "image_width": image_width,
            "image_height": image_height,
            "raw_response": result,
        }

    def predict(self, image: bytes | np.ndarray | Image.Image) -> Dict[str, Any]:
        """
        Run visual recognition on image.

        Args:
            image: Image as bytes, numpy array, or PIL Image

        Returns:
            Dictionary with predictions:
            {
                "predictions": [
                    {
                        "class": str,
                        "confidence": float,
                        "bbox": {...}
                    }
                ],
                "top_class": str,
                "top_confidence": float,
                "class_probabilities": Dict[str, float]
            }
        """
        if isinstance(image, np.ndarray):
            return self._infer_with_ndarray(image)

        if isinstance(image, Image.Image):
            return self._infer_with_pil(image)

        if isinstance(image, (bytes, bytearray)):
            try:
                pil = Image.open(io.BytesIO(image))
                pil = pil.convert("RGB")
            except Exception as e:
                print(f"[visual_service] Failed to decode image bytes: {e}")
                traceback.print_exc()
                return {
                    "error": str(e),
                    "predictions": [],
                    "top_class": None,
                    "top_confidence": 0.0,
                    "class_probabilities": {},
                }
            return self._infer_with_pil(pil)

        return {
            "error": "Unsupported image type. Expected bytes, numpy array, or PIL Image.",
            "predictions": [],
            "top_class": None,
            "top_confidence": 0.0,
            "class_probabilities": {},
        }

    async def predict_image(self, file: UploadFile) -> Dict[str, Any]:
        """
        Predict from FastAPI UploadFile.
        Reads bytes asynchronously, loads with PIL, then runs inference.
        """
        try:
            image_bytes = await file.read()
            if not image_bytes:
                return {
                    "error": "Uploaded image is empty.",
                    "predictions": [],
                    "top_class": None,
                    "top_confidence": 0.0,
                    "class_probabilities": {},
                }
            pil = Image.open(io.BytesIO(image_bytes))
            pil = pil.convert("RGB")
            result = self._infer_with_pil(pil)
            result["input_provided"] = True
            return result
        except Exception as e:
            print(f"[visual_service] Failed to read or process UploadFile: {e}")
            traceback.print_exc()
            return {
                "error": str(e),
                "predictions": [],
                "top_class": None,
                "top_confidence": 0.0,
                "class_probabilities": {},
            }

    def predict_from_file(self, file_path: str) -> Dict[str, Any]:
        """Predict from image file path."""
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        return self.predict(image_bytes)


# Singleton instance
_visual_service: Optional[VisualRecognitionService] = None


def get_visual_service() -> VisualRecognitionService:
    """Get or create singleton VisualRecognitionService instance."""
    global _visual_service
    if _visual_service is None:
        _visual_service = VisualRecognitionService()
    return _visual_service
