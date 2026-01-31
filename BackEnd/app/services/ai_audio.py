from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import librosa
import numpy as np
from tensorflow.keras.models import load_model


@dataclass
class AudioModelPaths:
    base_dir: Path

    @property
    def model_path(self) -> Path:
        return self.base_dir / "model.h5"

    @property
    def scaler_path(self) -> Path:
        # If you use a label encoder instead of scaler, rename accordingly
        return self.base_dir / "scaler.pkl"

    @property
    def labels_path(self) -> Path:
        return self.base_dir / "labels.json"

    @property
    def metadata_path(self) -> Path:
        return self.base_dir / "metadata.json"


class AudioClassifier:
    def __init__(self, base_dir: Path) -> None:
        self.paths = AudioModelPaths(base_dir=base_dir)
        self.model = None
        self.scaler = None
        self.labels = {}
        self.metadata = {}

    def load(self) -> None:
        if not self.paths.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.paths.model_path}")

        self.model = load_model(self.paths.model_path)

        if self.paths.scaler_path.exists():
            self.scaler = joblib.load(self.paths.scaler_path)

        if self.paths.labels_path.exists():
            self.labels = json.loads(self.paths.labels_path.read_text(encoding="ascii"))

        if self.paths.metadata_path.exists():
            self.metadata = json.loads(self.paths.metadata_path.read_text(encoding="ascii"))

    def _get_param(self, key: str, default: Any) -> Any:
        return self.metadata.get(key, default)

    def preprocess(self, audio_path: Path) -> Tuple[np.ndarray, Dict[str, Any]]:
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio not found: {audio_path}")

        sample_rate = int(self._get_param("sample_rate", 16000))
        n_mfcc = int(self._get_param("n_mfcc", 40))
        frame_length = float(self._get_param("frame_length", 0.025))
        frame_stride = float(self._get_param("frame_stride", 0.01))
        max_duration_sec = float(self._get_param("max_duration_sec", 3.0))

        # Load and resample to training sample rate
        y, sr = librosa.load(str(audio_path), sr=sample_rate, mono=True)

        # Trim or pad to fixed duration if needed
        max_len = int(sample_rate * max_duration_sec)
        if len(y) > max_len:
            y = y[:max_len]
        elif len(y) < max_len:
            y = np.pad(y, (0, max_len - len(y)), mode="constant")

        hop_length = int(sample_rate * frame_stride)
        n_fft = int(sample_rate * frame_length)

        mfcc = librosa.feature.mfcc(
            y=y,
            sr=sample_rate,
            n_mfcc=n_mfcc,
            hop_length=hop_length,
            n_fft=n_fft,
        )

        # Model-specific shaping: adjust as needed to match training input
        features = mfcc.astype(np.float32)

        # Apply scaler if provided (common for classical ML)
        if self.scaler is not None:
            features = self.scaler.transform(features.T).T

        # Expand dims for model input (example: (n_mfcc, time, 1))
        features = np.expand_dims(features, axis=-1)

        debug_info = {
            "sample_rate": sample_rate,
            "n_mfcc": n_mfcc,
            "frame_length": frame_length,
            "frame_stride": frame_stride,
            "max_duration_sec": max_duration_sec,
            "input_shape": features.shape,
        }

        return features, debug_info

    def predict(self, audio_path: Path) -> Dict[str, Any]:
        if self.model is None:
            self.load()

        features, debug_info = self.preprocess(audio_path)

        # Batch dimension
        batch = np.expand_dims(features, axis=0)
        preds = self.model.predict(batch)

        # Flatten prediction vector
        probs = np.squeeze(preds).tolist()

        if isinstance(probs, float):
            probs = [probs]

        # Map index -> label if available
        label_map = {int(k): v for k, v in self.labels.items()} if self.labels else {}
        top_idx = int(np.argmax(probs))
        top_label = label_map.get(top_idx, str(top_idx))

        return {
            "label": top_label,
            "confidence": float(np.max(probs)),
            "probabilities": probs,
            "debug": debug_info,
        }


_AUDIO_CLASSIFIER: Optional[AudioClassifier] = None


def get_audio_classifier() -> AudioClassifier:
    global _AUDIO_CLASSIFIER
    if _AUDIO_CLASSIFIER is None:
        base_dir = Path(__file__).resolve().parents[2] / "ml_models" / "audio" / "smartbin_audio_v1"
        _AUDIO_CLASSIFIER = AudioClassifier(base_dir=base_dir)
    return _AUDIO_CLASSIFIER


def predict_audio(file_path: str) -> Dict[str, Any]:
    classifier = get_audio_classifier()
    return classifier.predict(Path(file_path))
