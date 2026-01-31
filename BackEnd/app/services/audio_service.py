from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

import joblib
import librosa
import numpy as np
from tensorflow.keras.models import load_model


AudioInput = Union[str, Path, bytes, io.BytesIO]


@dataclass
class AudioModelPaths:
    base_dir: Path

    @property
    def model_path(self) -> Path:
        """Resolve model file: prefer audio_classification_model.h5, fallback to model.h5"""
        for name in ("audio_classification_model.h5", "model.h5"):
            p = self.base_dir / name
            if p.exists():
                return p
        return self.base_dir / "model.h5"  # default for clearer error message

    @property
    def encoder_path(self) -> Path:
        return self.base_dir / "label_encoder.pkl"

    @property
    def metadata_path(self) -> Path:
        return self.base_dir / "metadata.json"


class AudioService:
    def __init__(self, base_dir: Optional[Path] = None) -> None:
        self.base_dir = base_dir or (
            Path(__file__).resolve().parents[2] / "ml_models" / "audio" / "smartbin_audio_v1"
        )
        self.paths = AudioModelPaths(self.base_dir)
        self.model = None
        self.label_encoder = None
        self.metadata: Dict[str, Any] = {}

    def load(self) -> None:
        if not self.paths.model_path.exists():
            raise FileNotFoundError(f"Audio model not found: {self.paths.model_path}")

        self.model = load_model(self.paths.model_path)

        if not self.paths.encoder_path.exists():
            raise FileNotFoundError(f"Label encoder not found: {self.paths.encoder_path}")

        self.label_encoder = joblib.load(self.paths.encoder_path)

        if self.paths.metadata_path.exists():
            self.metadata = json.loads(self.paths.metadata_path.read_text(encoding="ascii"))

    def _get_param(self, key: str, default: Any) -> Any:
        return self.metadata.get(key, default)

    def _load_audio(self, audio_input: AudioInput) -> Tuple[np.ndarray, int]:
        if isinstance(audio_input, (str, Path)):
            audio_path = Path(audio_input)
            if not audio_path.exists():
                raise FileNotFoundError(f"Audio not found: {audio_path}")
            file_ext = audio_path.suffix.lower()
            if file_ext not in {".wav", ".mp3"}:
                raise ValueError("Invalid audio format. Use WAV or MP3.")
            try:
                y, sr = librosa.load(str(audio_path), sr=22050, mono=True)
                return y, sr
            except Exception as exc:
                raise ValueError("Failed to load audio file") from exc

        if isinstance(audio_input, bytes):
            if not audio_input:
                raise ValueError("Empty audio bytes")
            audio_input = io.BytesIO(audio_input)

        if isinstance(audio_input, io.BytesIO):
            try:
                y, sr = librosa.load(audio_input, sr=22050, mono=True)
                return y, sr
            except Exception as exc:
                raise ValueError("Failed to load audio bytes") from exc

        raise ValueError("Unsupported audio input type")

    def extract_features(self, audio_input: AudioInput) -> np.ndarray:
        y, sr = self._load_audio(audio_input)

        n_mfcc = 40
        n_fft = 2048
        hop_length = 512

        # Match training pipeline: MFCC -> mean over time (1D vector)
        mfcc = librosa.feature.mfcc(
            y=y,
            sr=sr,
            n_mfcc=n_mfcc,
            hop_length=hop_length,
            n_fft=n_fft,
        ).astype(np.float32)

        features = np.mean(mfcc.T, axis=0)
        return features

    def predict(self, audio_input: AudioInput) -> Dict[str, Any]:
        if self.model is None or self.label_encoder is None:
            self.load()

        features = self.extract_features(audio_input)
        batch = np.expand_dims(features, axis=0)

        try:
            preds = self.model.predict(batch)
        except Exception as exc:
            raise RuntimeError(f"Audio prediction failed: {exc}") from exc

        probs = np.squeeze(preds)
        if probs.ndim == 0:
            probs = np.array([float(probs)])

        top_idx = int(np.argmax(probs))
        confidence = float(np.max(probs))

        try:
            label = self.label_encoder.inverse_transform([top_idx])[0]
        except Exception:
            label = str(top_idx)

        return {"label": label, "confidence": confidence, "probabilities": probs.tolist()}
