# 🗑️ SmartBin AI - Weighted Probability Fusion Architecture

## Overview

SmartBin AI combines **Visual Recognition** (YOLOv8 via Roboflow) and **Audio Classification** (Local Librosa + Model) to detect trash types using a weighted probability fusion approach.

### Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Visual Input   │────────▶│  Roboflow YOLOv8  │
│   (Image)       │         │      (70%)        │
└─────────────────┘         └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ Weighted Fusion   │
                            │   Service        │
                            └──────────────────┘
                                      │
                                      ▼
┌─────────────────┐         ┌──────────────────┐
│  Audio Input    │────────▶│  Local Model      │
│   (Audio)       │         │   (30%)          │
└─────────────────┘         └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  Final Trash Type │
                            │   Classification │
                            └──────────────────┘
```

### Fusion Weights

- **Visual Weight:** 70% (0.7) - YOLOv8 object detection
- **Audio Weight:** 30% (0.3) - Local audio classification model

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Roboflow

Edit `backend/config.py`:

```python
ROBOFLOW_API_KEY = "your-api-key-here"
ROBOFLOW_MODEL_ID = "your-model-id-here"
```

Or set environment variables:

```bash
export ROBOFLOW_API_KEY="your-api-key"
export ROBOFLOW_MODEL_ID="your-model-id"
```

### 3. Configure Class Mappings

Edit `backend/config.py` to map your Roboflow model classes to trash types:

```python
VISUAL_CLASS_MAPPING = {
    "plastic_bottle": "plastic",
    "glass_bottle": "glass",
    "metal_can": "metal",
    "paper_cup": "paper",
    # Add your mappings here
}
```

### 4. Run Backend

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 5. Test Multimodal Endpoint

```bash
# With both image and audio
curl -X POST "http://localhost:8000/predict-multimodal" \
  -F "image=@trash_image.jpg" \
  -F "audio=@trash_audio.webm"

# With image only
curl -X POST "http://localhost:8000/predict-multimodal" \
  -F "image=@trash_image.jpg"

# With audio only
curl -X POST "http://localhost:8000/predict-multimodal" \
  -F "audio=@trash_audio.webm"
```

---

## 📡 API Endpoints

### POST `/predict-multimodal`

**Description:** Main endpoint for multimodal trash detection using weighted probability fusion.

**Request:**
- `image` (optional): Image file (JPEG, PNG, etc.)
- `audio` (optional): Audio file (WAV, WebM, etc.)
- At least one of `image` or `audio` must be provided

**Response:**
```json
{
  "trash_type": "plastic",
  "confidence": 0.85,
  "probabilities": {
    "plastic": 0.85,
    "glass": 0.10,
    "metal": 0.03,
    "paper": 0.01,
    "organic": 0.00,
    "bottle": 0.01,
    "other": 0.00
  },
  "visual_result": {
    "top_class": "plastic_bottle",
    "top_confidence": 0.92,
    "class_probabilities": {
      "plastic_bottle": 0.92,
      "bottle": 0.08
    }
  },
  "audio_result": {
    "label": "bottle",
    "confidence_score": 0.75
  },
  "fusion_details": {
    "visual_weight": 0.7,
    "audio_weight": 0.3,
    "visual_top_class": "plastic_bottle",
    "visual_top_confidence": 0.92,
    "audio_label": "bottle",
    "audio_confidence": 0.75
  },
  "elapsed_ms": 245,
  "weights": {
    "visual": 0.7,
    "audio": 0.3
  }
}
```

---

## 🔧 Configuration

### Adjust Fusion Weights

Edit `backend/config.py`:

```python
VISUAL_WEIGHT = 0.7  # 70% weight for visual
AUDIO_WEIGHT = 0.3   # 30% weight for audio
```

**Note:** Weights must sum to 1.0

### Configure Audio-to-Trash-Type Mapping

Edit `backend/config.py`:

```python
AUDIO_TO_TRASH_TYPE = {
    "bottle": {
        "plastic": 0.6,
        "glass": 0.3,
        "bottle": 0.1,
    },
    "anomaly": {
        "other": 0.5,
        "metal": 0.3,
        "plastic": 0.2,
    },
}
```

### Configure Visual Class Mapping

Edit `backend/config.py`:

```python
VISUAL_CLASS_MAPPING = {
    "plastic_bottle": "plastic",
    "glass_bottle": "glass",
    "metal_can": "metal",
    # Add your Roboflow model classes here
}
```

---

## 📊 Database Schema

The `PredictionLog` table stores multimodal predictions:

```python
class PredictionLog:
    id: int
    timestamp: datetime
    detected_label: str  # Legacy field
    confidence_score: float  # Legacy field
    trash_type: str  # Final fused trash type
    fusion_confidence: float  # Final fused confidence
    visual_class: str  # Visual prediction class
    visual_confidence: float  # Visual prediction confidence
    audio_label: str  # Audio prediction label
    audio_confidence: float  # Audio prediction confidence
    has_image: int  # 1 if image provided, 0 otherwise
    has_audio: int  # 1 if audio provided, 0 otherwise
```

---

## 🧪 Testing

### Python Example

```python
import requests

# Test multimodal detection
url = "http://localhost:8000/predict-multimodal"

with open("trash_image.jpg", "rb") as img, open("trash_audio.webm", "rb") as aud:
    files = {
        "image": ("trash_image.jpg", img, "image/jpeg"),
        "audio": ("trash_audio.webm", aud, "audio/webm")
    }
    response = requests.post(url, files=files)
    print(response.json())
```

### JavaScript Example

```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('audio', audioFile);

const response = await fetch('http://localhost:8000/predict-multimodal', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Trash Type:', result.trash_type);
console.log('Confidence:', result.confidence);
```

---

## 🎯 Use Cases

### 1. Image-Only Detection
When only image is available, visual recognition provides 100% weight (normalized).

### 2. Audio-Only Detection
When only audio is available, audio classification provides 100% weight (normalized).

### 3. Multimodal Detection (Recommended)
Combines both modalities for highest accuracy:
- Visual provides object type and appearance
- Audio provides material characteristics (glass vs plastic sound)

---

## 🔍 Troubleshooting

### Roboflow API Errors

**Error:** `inference_sdk not installed`
```bash
pip install inference-sdk
```

**Error:** `Invalid API key`
- Check your Roboflow API key in `backend/config.py`
- Verify API key at https://roboflow.com/account/api

**Error:** `Model not found`
- Verify your model ID in `backend/config.py`
- Check model is published and accessible via API

### Audio Processing Errors

**Error:** `Could not decode audio`
- Ensure FFmpeg is installed (see main README)
- Check audio format is supported

### Fusion Issues

**Warning:** `Weights must sum to 1.0`
- Ensure `VISUAL_WEIGHT + AUDIO_WEIGHT = 1.0` in `backend/config.py`

---

## 📈 Performance Optimization

### 1. Adjust Weights Based on Modality Reliability

If visual is more reliable:
```python
VISUAL_WEIGHT = 0.8
AUDIO_WEIGHT = 0.2
```

If audio is more reliable:
```python
VISUAL_WEIGHT = 0.6
AUDIO_WEIGHT = 0.4
```

### 2. Confidence Thresholds

Edit `backend/config.py`:

```python
MIN_VISUAL_CONFIDENCE = 0.3  # Minimum visual confidence
MIN_AUDIO_CONFIDENCE = 0.2   # Minimum audio confidence
MIN_FUSION_CONFIDENCE = 0.4  # Minimum final fusion confidence
```

### 3. Caching

Visual and audio services use singleton pattern for efficient resource usage.

---

## 🔐 Security Notes

⚠️ **Important:** Move API keys to environment variables:

```python
import os

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "default-key")
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "default-model")
```

Or use `.env` file with `python-dotenv`:

```bash
pip install python-dotenv
```

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## 📚 Architecture Details

### Fusion Algorithm

1. **Normalize Visual Predictions:**
   - Map Roboflow classes to trash types
   - Extract confidence scores per class

2. **Normalize Audio Predictions:**
   - Map audio labels ("bottle", "anomaly") to trash types
   - Scale by audio confidence

3. **Weighted Fusion:**
   ```
   P_fused(type) = (visual_weight × P_visual(type)) + (audio_weight × P_audio(type))
   ```

4. **Select Top Prediction:**
   - Choose trash type with highest fused probability
   - Apply minimum confidence threshold

### Error Handling

- If visual fails: Uses audio-only (100% audio weight)
- If audio fails: Uses visual-only (100% visual weight)
- If both fail: Returns "other" with low confidence

---

## 🚧 Future Enhancements

- [ ] Dynamic weight adjustment based on confidence scores
- [ ] Support for video input
- [ ] Real-time streaming fusion
- [ ] Multi-class audio classification (not just bottle/anomaly)
- [ ] Confidence calibration
- [ ] A/B testing framework for weight optimization

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

[Contributing Guidelines]

---

**Built with ❤️ for Smart Waste Management**
