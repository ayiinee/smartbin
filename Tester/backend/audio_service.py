"""
Audio Classification Service using a Keras/TensorFlow model (.h5)
and MFCC features.
"""
from __future__ import annotations

import io
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import librosa
import numpy as np
import soundfile as sf
import tensorflow as tf

from .config import (
    AUDIO_HOP_LENGTH,
    AUDIO_LABEL_ENCODER_PATH,
    AUDIO_MODEL_PATH,
    AUDIO_N_FFT,
    AUDIO_N_MFCC,
    AUDIO_SAMPLE_RATE,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "audio_classification_model.h5"
DEFAULT_LABEL_ENCODER_PATH = BASE_DIR / "models" / "label_encoder.pkl"


def _resolve_path(path_value: str | None, default_path: Path) -> Path:
    if path_value:
        candidate = Path(path_value)
        if not candidate.is_absolute():
            candidate = BASE_DIR / candidate
        return candidate
    return default_path


def _suffix_for_audio(filename: Optional[str], content_type: Optional[str]) -> str:
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ("webm", "ogg", "opus", "wav", "flac", "mp3", "m4a"):
            return f".{ext}"
    if content_type:
        c = content_type.lower().split(";")[0].strip()
        if "webm" in c:
            return ".webm"
        if "ogg" in c:
            return ".ogg"
    return ".webm"


def decode_audio_from_bytes(
    audio_bytes: bytes,
    target_sr: int = AUDIO_SAMPLE_RATE,
    mono: bool = True,
    *,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> tuple[np.ndarray, int]:
    """
    Decode audio bytes to waveform. Uses soundfile when possible; falls back to
    librosa (audioread + ffmpeg) for WebM/Opus etc.
    """
    bio = io.BytesIO(audio_bytes)
    err: Optional[Exception] = None

    try:
        y, sr = sf.read(bio, dtype="float32", always_2d=False)
    except Exception as e:
        err = e
        y, sr = None, None

    if y is not None and y.size > 0:
        if mono and y.ndim == 2:
            y = np.mean(y, axis=1)
        if sr != target_sr:
            y = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=target_sr)
            sr = target_sr
        return y, target_sr

    suffix = _suffix_for_audio(filename, content_type)
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            tmp = f.name
            f.write(audio_bytes)
        y, sr = librosa.load(tmp, sr=target_sr, mono=True, dtype=np.float32)
    finally:
        if tmp and os.path.isfile(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass

    if y.size == 0:
        raise ValueError(
            "Decoded audio is empty. Ensure ffmpeg is installed for WebM/Opus input."
        )
    return y, sr


def _pad_or_trim(arr: np.ndarray, target_len: int, axis: int) -> np.ndarray:
    if target_len is None or target_len <= 0:
        return arr
    length = arr.shape[axis]
    if length == target_len:
        return arr
    if length > target_len:
        slc = [slice(None)] * arr.ndim
        slc[axis] = slice(0, target_len)
        return arr[tuple(slc)]
    pad_width = [(0, 0)] * arr.ndim
    pad_width[axis] = (0, target_len - length)
    return np.pad(arr, pad_width, mode="constant")


def _resolve_n_mfcc(input_shape: tuple[Any, ...], default_n_mfcc: int) -> int:
    dims = [d for d in input_shape[1:] if isinstance(d, int)]
    if not dims:
        return default_n_mfcc
    if default_n_mfcc in dims:
        return default_n_mfcc
    small_dims = [d for d in dims if 2 <= d <= 128]
    if small_dims:
        return min(small_dims)
    return default_n_mfcc


def _extract_mfcc(y: np.ndarray, sr: int, n_mfcc: int) -> np.ndarray:
    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=n_mfcc,
        hop_length=AUDIO_HOP_LENGTH,
        n_fft=AUDIO_N_FFT,
    )
    return mfcc.astype(np.float32)


def _prepare_input(
    mfcc: np.ndarray, input_shape: tuple[Any, ...], n_mfcc: int
) -> np.ndarray:
    target_dims = input_shape[1:]

    if len(target_dims) == 1:
        # Use mean across time to get a vector
        vec = np.mean(mfcc, axis=1)
        target_len = target_dims[0] if isinstance(target_dims[0], int) else vec.shape[0]
        vec = _pad_or_trim(vec, target_len, axis=0)
        return vec[np.newaxis, :].astype(np.float32)

    # Determine orientation by matching n_mfcc to target dims
    data = mfcc
    time_axis = 1
    target_time = None
    if len(target_dims) >= 2:
        dim0 = target_dims[0] if isinstance(target_dims[0], int) else None
        dim1 = target_dims[1] if isinstance(target_dims[1], int) else None
        if dim0 == n_mfcc or dim0 is None:
            data = mfcc
            time_axis = 1
            target_time = dim1
        elif dim1 == n_mfcc:
            data = mfcc.T
            time_axis = 0
            target_time = dim0
        else:
            data = mfcc
            time_axis = 1
            target_time = dim1

    if target_time:
        data = _pad_or_trim(data, target_time, axis=time_axis)

    if len(target_dims) == 3:
        if target_dims[-1] == 1 and data.ndim == 2:
            data = data[..., np.newaxis]
        elif target_dims[0] == 1 and data.ndim == 2:
            data = data[np.newaxis, ...]

    return data[np.newaxis, ...].astype(np.float32)


class AudioClassificationService:
    """Audio classifier using MFCC + Keras/TensorFlow model."""

    def __init__(self) -> None:
        self.model_path = _resolve_path(AUDIO_MODEL_PATH, DEFAULT_MODEL_PATH)
        self.label_encoder_path = _resolve_path(
            AUDIO_LABEL_ENCODER_PATH, DEFAULT_LABEL_ENCODER_PATH
        )
        if not self.model_path.is_file():
            raise FileNotFoundError(
                f"Audio model not found at {self.model_path}. "
                "Ensure models/audio_classification_model.h5 exists."
            )
        if not self.label_encoder_path.is_file():
            raise FileNotFoundError(
                f"Label encoder not found at {self.label_encoder_path}. "
                "Ensure models/label_encoder.pkl exists."
            )

        self.model = tf.keras.models.load_model(self.model_path)
        self.label_encoder = joblib.load(self.label_encoder_path)
        self.labels = self._extract_labels(self.label_encoder)

    @staticmethod
    def _extract_labels(label_encoder) -> list[str]:
        if hasattr(label_encoder, "classes_"):
            return [str(x) for x in list(label_encoder.classes_)]
        if hasattr(label_encoder, "labels_"):
            return [str(x) for x in list(label_encoder.labels_)]
        if isinstance(label_encoder, dict) and "classes" in label_encoder:
            return [str(x) for x in label_encoder["classes"]]
        return []

    def _predict_probs(self, y: np.ndarray, sr: int) -> np.ndarray:
        input_shape = (
            self.model.input_shape[0]
            if isinstance(self.model.input_shape, list)
            else self.model.input_shape
        )
        n_mfcc = _resolve_n_mfcc(input_shape, AUDIO_N_MFCC)
        mfcc = _extract_mfcc(y, sr, n_mfcc)
        model_input = _prepare_input(mfcc, input_shape, n_mfcc)
        probs = self.model.predict(model_input, verbose=0)
        if isinstance(probs, list) and probs:
            probs = probs[0]
        probs = np.asarray(probs).squeeze()
        return probs

    def predict(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        probs = self._predict_probs(y, sr)
        if probs.ndim != 1:
            probs = probs.reshape(-1)
        top_idx = int(np.argmax(probs)) if probs.size else 0
        label = (
            self.label_encoder.inverse_transform([top_idx])[0]
            if hasattr(self.label_encoder, "inverse_transform")
            else (self.labels[top_idx] if self.labels else str(top_idx))
        )
        confidence = float(probs[top_idx]) if probs.size else 0.0
        prob_map: Dict[str, float] = {}
        if self.labels and len(self.labels) == probs.size:
            for idx, name in enumerate(self.labels):
                prob_map[str(name)] = float(probs[idx])
        else:
            for idx in range(probs.size):
                prob_map[str(idx)] = float(probs[idx])

        return {
            "label": str(label),
            "confidence_score": confidence,
            "probabilities": prob_map,
        }

    def predict_bytes(
        self,
        audio_bytes: bytes,
        *,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        y, sr = decode_audio_from_bytes(
            audio_bytes,
            target_sr=AUDIO_SAMPLE_RATE,
            mono=True,
            filename=filename,
            content_type=content_type,
        )
        result = self.predict(y, sr)
        result["sr"] = sr
        result["num_samples"] = int(y.shape[0])
        result["input_provided"] = True
        return result


_audio_service: AudioClassificationService | None = None


def get_audio_service() -> AudioClassificationService:
    global _audio_service
    if _audio_service is None:
        _audio_service = AudioClassificationService()
    return _audio_service
