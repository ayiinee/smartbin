"""
Configuration for SmartBin AI - Weighted Probability Fusion Architecture
"""
from typing import Dict

# Fusion Weights
VISUAL_WEIGHT = 0.3  # 30% weight for visual recognition
AUDIO_WEIGHT = 0.7   # 70% weight for audio classification

# Roboflow Configuration
import os

ROBOFLOW_API_URL = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "asoKfJFJaAF3MEtPkjCz")  # Set via environment variable
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "garbage-2mxmf/1")  # Set via environment variable
ROBOFLOW_WORKSPACE_NAME = os.getenv("ROBOFLOW_WORKSPACE_NAME") or os.getenv(
    "ROBOFLOW_WORKSPACE", ""
)
ROBOFLOW_WORKFLOW_ID = os.getenv("ROBOFLOW_WORKFLOW_ID", "")
ROBOFLOW_WORKFLOW_IMAGE_INPUT = os.getenv("ROBOFLOW_WORKFLOW_IMAGE_INPUT", "image")
ROBOFLOW_WORKFLOW_PREDICTIONS_KEY = os.getenv("ROBOFLOW_WORKFLOW_PREDICTIONS_KEY", "predictions")

# Trash Type Categories (Final classes)
TRASH_TYPES = [
    "plastic",
    "metal",
    "glass",
]

# Camera Configuration (OpenCV)
# CAMERA_INDEX=0 uses the default system camera.
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
# CAMERA_BACKEND options: "AUTO", "DSHOW", "MSMF"
CAMERA_BACKEND = os.getenv("CAMERA_BACKEND", "AUTO").upper()

# Audio Model Configuration
AUDIO_MODEL_PATH = os.getenv("AUDIO_MODEL_PATH", "models/audio_classification_model.h5")
AUDIO_LABEL_ENCODER_PATH = os.getenv("AUDIO_LABEL_ENCODER_PATH", "models/label_encoder.pkl")
AUDIO_SAMPLE_RATE = int(os.getenv("AUDIO_SAMPLE_RATE", "22050"))
AUDIO_N_MFCC = int(os.getenv("AUDIO_N_MFCC", "40"))
AUDIO_HOP_LENGTH = int(os.getenv("AUDIO_HOP_LENGTH", "512"))
AUDIO_N_FFT = int(os.getenv("AUDIO_N_FFT", "2048"))

# Visual to Trash Type Mapping (from Roboflow YOLOv8)
# This will be populated based on your Roboflow model's output classes
VISUAL_CLASS_MAPPING: Dict[str, str] = {
    # Map Roboflow class names to our trash types
    # Example: "plastic_bottle" -> "plastic"
    # Add your actual class mappings here
}

# Minimum confidence thresholds
MIN_VISUAL_CONFIDENCE = 0.3  # Minimum confidence for visual detection
MIN_AUDIO_CONFIDENCE = 0.2   # Minimum confidence for audio detection
MIN_FUSION_CONFIDENCE = 0.4  # Minimum confidence for final fusion result
