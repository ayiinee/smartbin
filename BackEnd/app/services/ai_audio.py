from __future__ import annotations
import json
import joblib
import librosa
import numpy as np
import tensorflow as tf
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

@dataclass
class AudioModelPaths:
    """Manajemen path model audio secara absolut"""
    base_dir: Path

    @property
    def model_path(self) -> Path: return self.base_dir / "model.h5"
    @property
    def scaler_path(self) -> Path: return self.base_dir / "scaler.pkl"
    @property
    def labels_path(self) -> Path: return self.base_dir / "labels.json"
    @property
    def metadata_path(self) -> Path: return self.base_dir / "metadata.json"

class AudioClassifier:
    def __init__(self, base_dir: Path) -> None:
        self.paths = AudioModelPaths(base_dir=base_dir)
        self.model = None
        self.scaler = None
        self.labels = {}
        self.metadata = {}

    def load(self) -> None:
        """Memuat model dan dependensi satu kali (Singleton)"""
        if not self.paths.model_path.exists():
            raise FileNotFoundError(f"Model h5 tidak ditemukan: {self.paths.model_path}")
        
        self.model = tf.keras.models.load_model(self.paths.model_path)
        
        if self.paths.scaler_path.exists():
            self.scaler = joblib.load(self.paths.scaler_path)
        if self.paths.labels_path.exists():
            self.labels = json.loads(self.paths.labels_path.read_text(encoding="utf-8"))
        if self.paths.metadata_path.exists():
            self.metadata = json.loads(self.paths.metadata_path.read_text(encoding="utf-8"))

    def _get_param(self, key: str, default: Any) -> Any:
        return self.metadata.get(key, default)

    def preprocess(self, audio_path: Path) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Preprocessing audio sesuai parameter training"""
        sample_rate = int(self._get_param("sample_rate", 16000))
        n_mfcc = int(self._get_param("n_mfcc", 40))
        max_duration = float(self._get_param("max_duration_sec", 3.0))

        y, sr = librosa.load(str(audio_path), sr=sample_rate, mono=True)
        
        # Penyeragaman durasi (Padding/Trim)
        max_len = int(sample_rate * max_duration)
        y = y[:max_len] if len(y) > max_len else np.pad(y, (0, max_len - len(y)))

        mfcc = librosa.feature.mfcc(y=y, sr=sample_rate, n_mfcc=n_mfcc)
        features = mfcc.astype(np.float32)

        # Skalasi jika ada scaler.pkl
        if self.scaler is not None:
            features = self.scaler.transform(features.T).T

        # Expand dims untuk input model (Batch, MFCC, Time, 1)
        features = np.expand_dims(features, axis=-1)
        return features, {"shape": features.shape, "sr": sample_rate}

    def predict(self, audio_path: str | Path) -> Dict[str, Any]:
        """Fungsi utama untuk inferensi audio"""
        if self.model is None: self.load()
        
        path_obj = Path(audio_path)
        features, debug = self.preprocess(path_obj)
        
        batch = np.expand_dims(features, axis=0)
        preds = self.model.predict(batch, verbose=0)
        probs = np.squeeze(preds)

        # Mapping label dari labels.json
        label_map = {int(k): v for k, v in self.labels.items()} if self.labels else {}
        top_idx = int(np.argmax(probs))
        
        return {
            "label": label_map.get(top_idx, str(top_idx)),
            "confidence": float(np.max(probs)),
            "debug": debug
        }

# Objek Global untuk Singleton
_CLASSIFIER: Optional[AudioClassifier] = None

def predict_audio(file_path: str) -> Dict[str, Any]:
    """Helper function untuk diakses oleh fusion.py"""
    global _CLASSIFIER
    if _CLASSIFIER is None:
        # Menuju folder server/ml_models/audio/smartbin_audio_v1/
        base_dir = Path(__file__).resolve().parents[2] / "ml_models" / "audio" / "smartbin_audio_v1"
        _CLASSIFIER = AudioClassifier(base_dir=base_dir)
    return _CLASSIFIER.predict(file_path)