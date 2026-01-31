"""
Weighted Probability Fusion Service
Combines Visual (YOLOv8) and Audio (Local Model) predictions
"""
from __future__ import annotations

from typing import Any, Dict

import numpy as np

from .config import (
    AUDIO_WEIGHT,
    MIN_AUDIO_CONFIDENCE,
    MIN_FUSION_CONFIDENCE,
    MIN_VISUAL_CONFIDENCE,
    TRASH_TYPES,
    VISUAL_CLASS_MAPPING,
    VISUAL_WEIGHT,
)


class WeightedProbabilityFusion:
    """
    Weighted Probability Fusion for combining visual and audio predictions.
    
    Architecture:
    - Audio Weight: 70% (0.7)
    - Visual Weight: 30% (0.3)
    """

    def __init__(
        self,
        visual_weight: float = VISUAL_WEIGHT,
        audio_weight: float = AUDIO_WEIGHT,
    ):
        """
        Initialize fusion service.

        Args:
            visual_weight: Weight for visual predictions (default: 0.3)
            audio_weight: Weight for audio predictions (default: 0.7)
        """
        if abs(visual_weight + audio_weight - 1.0) > 0.01:
            raise ValueError(
                f"Weights must sum to 1.0, got {visual_weight} + {audio_weight} = {visual_weight + audio_weight}"
            )
        
        self.visual_weight = visual_weight
        self.audio_weight = audio_weight

    def normalize_visual_predictions(
        self, visual_result: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Normalize visual predictions to trash type probabilities.

        Args:
            visual_result: Result from VisualRecognitionService

        Returns:
            Dictionary mapping trash types to probabilities
        """
        class_probs = visual_result.get("class_probabilities", {})
        trash_probs = {trash_type: 0.0 for trash_type in TRASH_TYPES}

        # Map Roboflow classes to trash types
        for class_name, confidence in class_probs.items():
            # Try direct mapping first
            mapped_type = VISUAL_CLASS_MAPPING.get(class_name.lower(), None)
            
            if mapped_type and mapped_type in trash_probs:
                # Take maximum if multiple classes map to same type
                trash_probs[mapped_type] = max(
                    trash_probs[mapped_type], confidence
                )
            else:
                # Try fuzzy matching
                class_lower = class_name.lower()
                for trash_type in TRASH_TYPES:
                    if trash_type in class_lower or class_lower in trash_type:
                        trash_probs[trash_type] = max(
                            trash_probs[trash_type], confidence
                        )
                        break

        return trash_probs

    def normalize_audio_predictions(
        self, audio_result: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Normalize audio predictions to trash type probabilities.

        Args:
            audio_result: Result from audio classification
                Expected: {"label": "plastic"|"metal"|"glass", "confidence_score": float, "probabilities": {...}}

        Returns:
            Dictionary mapping trash types to probabilities
        """
        probs = audio_result.get("probabilities") or {}
        trash_probs = {trash_type: 0.0 for trash_type in TRASH_TYPES}

        if isinstance(probs, dict) and probs:
            for label, score in probs.items():
                label_lower = str(label).lower()
                for trash_type in TRASH_TYPES:
                    if label_lower == trash_type:
                        trash_probs[trash_type] = max(
                            trash_probs[trash_type], float(score)
                        )
                        break
        else:
            label = str(audio_result.get("label", "")).lower()
            confidence = float(audio_result.get("confidence_score", 0.0))
            if label in trash_probs:
                trash_probs[label] = max(trash_probs[label], confidence)

        return trash_probs

    def fuse(
        self,
        visual_result: Dict[str, Any],
        audio_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Fuse visual and audio predictions using weighted probability.

        Args:
            visual_result: Result from VisualRecognitionService
            audio_result: Result from audio classification

        Returns:
            Fused prediction result:
            {
                "trash_type": str,
                "confidence": float,
                "probabilities": Dict[str, float],
                "visual_contribution": Dict[str, float],
                "audio_contribution": Dict[str, float],
                "fusion_details": {...}
            }
        """
        # Normalize predictions
        visual_probs = self.normalize_visual_predictions(visual_result)
        audio_probs = self.normalize_audio_predictions(audio_result)

        # Determine modality availability and effective weights
        visual_input = bool(visual_result.get("input_provided", True))
        audio_input = bool(audio_result.get("input_provided", True))
        visual_error = bool(visual_result.get("error"))
        audio_error = bool(audio_result.get("error"))
        visual_confidence = float(visual_result.get("top_confidence", 0.0) or 0.0)
        audio_confidence = float(audio_result.get("confidence_score", 0.0) or 0.0)
        visual_has_signal = any(v > 0.0 for v in visual_probs.values())
        audio_has_signal = any(v > 0.0 for v in audio_probs.values())

        if visual_input and audio_input:
            visual_ok = (
                not visual_error
                and visual_has_signal
                and visual_confidence >= MIN_VISUAL_CONFIDENCE
            )
            audio_ok = (
                not audio_error
                and audio_has_signal
                and audio_confidence >= MIN_AUDIO_CONFIDENCE
            )
        else:
            # If only one modality was provided, don't penalize low confidence.
            visual_ok = visual_input and not visual_error and visual_has_signal
            audio_ok = audio_input and not audio_error and audio_has_signal

        if visual_ok and audio_ok:
            effective_visual_weight = self.visual_weight
            effective_audio_weight = self.audio_weight
        elif visual_ok:
            effective_visual_weight = 1.0
            effective_audio_weight = 0.0
        elif audio_ok:
            effective_visual_weight = 0.0
            effective_audio_weight = 1.0
        else:
            effective_visual_weight = 0.0
            effective_audio_weight = 0.0

        # Weighted fusion
        fused_probs = {}
        for trash_type in TRASH_TYPES:
            fused_probs[trash_type] = (
                effective_visual_weight * visual_probs.get(trash_type, 0.0)
                + effective_audio_weight * audio_probs.get(trash_type, 0.0)
            )

        # Normalize to ensure probabilities sum to reasonable range
        total = sum(fused_probs.values())
        if total > 0:
            # Soft normalization (preserve relative differences)
            fused_probs = {
                k: v / total * min(total, 1.0) for k, v in fused_probs.items()
            }

        # Get top prediction
        top_type = max(fused_probs.items(), key=lambda x: x[1])[0]
        top_confidence = fused_probs[top_type]

        low_confidence = top_confidence < MIN_FUSION_CONFIDENCE

        return {
            "trash_type": top_type,
            "confidence": float(top_confidence),
            "probabilities": {k: float(v) for k, v in fused_probs.items()},
            "visual_contribution": {
                k: float(v * effective_visual_weight)
                for k, v in visual_probs.items()
            },
            "audio_contribution": {
                k: float(v * effective_audio_weight)
                for k, v in audio_probs.items()
            },
            "fusion_details": {
                "visual_weight": self.visual_weight,
                "audio_weight": self.audio_weight,
                "effective_visual_weight": effective_visual_weight,
                "effective_audio_weight": effective_audio_weight,
                "visual_input_provided": visual_input,
                "audio_input_provided": audio_input,
                "visual_available": visual_ok,
                "audio_available": audio_ok,
                "visual_top_class": visual_result.get("top_class"),
                "visual_top_confidence": visual_confidence,
                "audio_label": audio_result.get("label"),
                "audio_confidence": audio_confidence,
                "low_confidence": low_confidence,
            },
        }

    def fuse_multimodal(
        self,
        image: bytes | None = None,
        audio: bytes | None = None,
        visual_service=None,
        audio_predict_func=None,
    ) -> Dict[str, Any]:
        """
        Convenience method to fuse from raw inputs.

        Args:
            image: Image bytes (optional)
            audio: Audio bytes (optional)
            visual_service: VisualRecognitionService instance
            audio_predict_func: Function to predict audio (y, sr) -> dict

        Returns:
            Fused prediction result
        """
        visual_result = {
            "class_probabilities": {},
            "top_class": None,
            "top_confidence": 0.0,
            "input_provided": bool(image),
        }
        audio_result = {
            "label": None,
            "confidence_score": 0.0,
            "input_provided": bool(audio),
        }

        # Get visual prediction if image provided
        if image and visual_service:
            try:
                visual_result = visual_service.predict(image)
            except Exception as e:
                visual_result["error"] = str(e)

        # Get audio prediction if audio provided
        if audio and audio_predict_func:
            try:
                # Note: audio_predict_func should handle audio decoding
                audio_result = audio_predict_func(audio)
            except Exception as e:
                audio_result["error"] = str(e)

        return self.fuse(visual_result, audio_result)


# Singleton instance
_fusion_service: WeightedProbabilityFusion | None = None


def get_fusion_service() -> WeightedProbabilityFusion:
    """Get or create singleton WeightedProbabilityFusion instance."""
    global _fusion_service
    if _fusion_service is None:
        _fusion_service = WeightedProbabilityFusion()
    return _fusion_service
