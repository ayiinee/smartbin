# Roboflow Inference Setup Guide

## Overview

Sistem SmartBin menggunakan **Roboflow Inference** untuk deteksi objek. Roboflow Inference memisahkan proses training (di cloud) dengan proses deployment (di perangkat lokal), sehingga sangat efisien dan mudah digunakan.

## Alur Penggunaan (Workflow)

### 1. Persiapan

#### Install Dependencies
```bash
pip install inference-sdk roboflow opencv-python supervision
```

Dependencies utama:
- `inference-sdk`: Library untuk menjalankan inferensi Roboflow
- `roboflow`: SDK Roboflow untuk interaksi dengan API
- `opencv-python`: Untuk pemrosesan gambar
- `supervision`: Untuk visualisasi dan annotasi hasil deteksi

#### Dapatkan API Key
1. Buka dashboard Roboflow: https://app.roboflow.com/
2. Login atau buat akun baru
3. Navigasi ke Settings → API Keys
4. Copy API Key Anda

### 2. Identifikasi Model

Anda perlu **Model ID** untuk memanggil model yang diinginkan. Format Model ID:

```
workspace/project/version
```

Contoh:
- `garbage-2mxmf` (model public)
- `my-workspace/smartbin-detector/1` (model pribadi)

Cara mendapatkan Model ID:
1. Buka project Anda di Roboflow
2. Pilih versi model yang ingin digunakan
3. Model ID akan terlihat di URL atau di bagian "Deploy"

### 3. Konfigurasi Environment

Buat file `.env` di folder `BackEnd/` dengan konfigurasi berikut:

```env
# Roboflow Configuration
ROBOFLOW_API_KEY=your-api-key-here
ROBOFLOW_MODEL_ID=garbage-2mxmf

# Optional: Jika menggunakan workspace dan project terpisah
# ROBOFLOW_WORKSPACE=your-workspace
# ROBOFLOW_PROJECT=your-project
# ROBOFLOW_VERSION=1

# Optional: Workflow inference (untuk pipeline kompleks)
# ROBOFLOW_WORKFLOW_ID=active-learning
# ROBOFLOW_WORKFLOW_WORKSPACE=your-workflow-workspace
# ROBOFLOW_WORKFLOW_API_URL=https://detect.roboflow.com
# ROBOFLOW_WORKFLOW_IMAGE_INPUT=image
# ROBOFLOW_WORKFLOW_PREDICTIONS_KEY=predictions
# ROBOFLOW_WORKFLOW_OUTPUT_IMAGE_KEY=output_image
```

### 4. Implementasi

#### A. Deteksi dari Gambar Statis

Gunakan fungsi `get_model` untuk memproses gambar statis:

```python
from inference_sdk import InferenceHTTPClient

# Initialize client
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="YOUR_API_KEY"
)

# Infer dari file path
result = client.infer("path/to/image.jpg", model_id="garbage-2mxmf")

# Infer dari numpy array
import cv2
image = cv2.imread("path/to/image.jpg")
result = client.infer(image, model_id="garbage-2mxmf")

# Infer dari base64
import base64
with open("image.jpg", "rb") as f:
    b64_string = base64.b64encode(f.read()).decode()
result = client.infer(b64_string, model_id="garbage-2mxmf")
```

#### B. Deteksi dari Video/Webcam Real-time

Gunakan `InferencePipeline` untuk memproses video/webcam secara real-time:

```python
from inference import InferencePipeline
import cv2

def on_prediction(predictions, video_frame):
    """Callback untuk setiap frame yang diproses"""
    print(f"Detections: {predictions}")
    # Process predictions...
    return predictions

# Initialize pipeline
pipeline = InferencePipeline.init(
    model_id="garbage-2mxmf",
    video_reference=0,  # 0 untuk webcam, atau path ke video file
    on_prediction=on_prediction,
    api_key="YOUR_API_KEY"
)

# Start pipeline
pipeline.start()
pipeline.join()
```

### 5. Struktur Response

Response dari Roboflow Inference memiliki struktur berikut:

```json
{
  "predictions": [
    {
      "x": 320.5,
      "y": 240.0,
      "width": 100.0,
      "height": 150.0,
      "confidence": 0.95,
      "class": "Plastic",
      "class_id": 0
    }
  ],
  "image": {
    "width": 640,
    "height": 480
  }
}
```

## Implementasi di SmartBin Backend

### Visual Service (`app/services/visual_service.py`)

Service ini menggunakan Roboflow Inference untuk deteksi objek:

```python
from inference_sdk import InferenceHTTPClient

class VisualService:
    def __init__(self):
        self.client = InferenceHTTPClient(
            api_url=os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com"),
            api_key=os.getenv("ROBOFLOW_API_KEY")
        )
        self.model_id = os.getenv("ROBOFLOW_MODEL_ID", "garbage-2mxmf")
    
    def detect_from_file_bytes(self, image_bytes):
        """Deteksi dari bytes gambar"""
        result = self.client.infer(image_bytes, model_id=self.model_id)
        return self._normalize_result(result)
    
    def detect_from_base64(self, b64_string):
        """Deteksi dari base64 string"""
        result = self.client.infer(b64_string, model_id=self.model_id)
        return self._normalize_result(result)
```

### Audio Service (`app/services/audio_service.py`)

Service ini menggunakan TensorFlow model untuk klasifikasi audio:

```python
from tensorflow.keras.models import load_model
import librosa
import numpy as np

class AudioService:
    def __init__(self):
        self.model = load_model("ml_models/audio/smartbin_audio_v1/model.h5")
        self.label_encoder = joblib.load("ml_models/audio/smartbin_audio_v1/label_encoder.pkl")
    
    def predict(self, audio_bytes):
        """Prediksi dari bytes audio"""
        # Extract MFCC features
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050, mono=True)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        features = np.mean(mfcc.T, axis=0)
        
        # Predict
        batch = np.expand_dims(features, axis=0)
        preds = self.model.predict(batch)
        
        # Get label
        top_idx = np.argmax(preds)
        label = self.label_encoder.inverse_transform([top_idx])[0]
        confidence = float(np.max(preds))
        
        return {"label": label, "confidence": confidence}
```

### Multimodal Endpoint (`app/routes/ai_routes.py`)

Endpoint ini menggabungkan deteksi visual dan audio:

```python
@ai_bp.post("/predict/multimodal")
def predict_multimodal():
    visual_result = {"label": None, "confidence": 0.0}
    audio_result = {"label": None, "confidence": 0.0}
    errors = {}
    
    # Process image
    if "image" in request.files:
        try:
            service = VisualService()
            result = service.detect_from_file_bytes(request.files["image"].read())
            visual_result = result
        except Exception as exc:
            errors["visual"] = str(exc)
    
    # Process audio
    if "audio" in request.files:
        try:
            service = AudioService()
            result = service.predict(request.files["audio"].read())
            audio_result = result
        except Exception as exc:
            errors["audio"] = str(exc)
    
    return jsonify({
        "visual": visual_result,
        "audio": audio_result,
        "errors": errors or None
    })
```

## Keuntungan Menggunakan Roboflow Inference

1. **Separation of Concerns**: Training di cloud, deployment di local
2. **Easy to Use**: API yang simple dan intuitif
3. **Flexible**: Support berbagai format input (file, bytes, base64, numpy array)
4. **Fast**: Optimized untuk inferensi real-time
5. **Scalable**: Bisa digunakan untuk single image atau video streaming
6. **Cloud-based**: Model di-host di cloud, tidak perlu download model file
7. **Version Control**: Mudah switch antara versi model yang berbeda

## Troubleshooting

### Error: "ROBOFLOW_API_KEY is not set"
- Pastikan file `.env` sudah dibuat dan berisi `ROBOFLOW_API_KEY`
- Pastikan file `.env` berada di folder `BackEnd/`
- Restart aplikasi setelah menambahkan API key

### Error: "Model not found"
- Pastikan `ROBOFLOW_MODEL_ID` benar
- Cek apakah model sudah di-deploy di Roboflow dashboard
- Pastikan API key memiliki akses ke model tersebut

### Error: "Invalid API key"
- Pastikan API key yang digunakan benar
- Cek apakah API key masih aktif di dashboard Roboflow

### Deteksi lambat
- Gunakan gambar dengan resolusi lebih kecil (max 640px width)
- Gunakan model yang lebih kecil/cepat
- Pertimbangkan menggunakan Roboflow Inference Server (self-hosted)

## Resources

- Roboflow Documentation: https://docs.roboflow.com/
- Inference SDK: https://github.com/roboflow/inference
- Roboflow Universe (Public Models): https://universe.roboflow.com/
- API Reference: https://docs.roboflow.com/api-reference/inference
