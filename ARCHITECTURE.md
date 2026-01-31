# SmartBin Architecture: Backend-First AI Detection

## Overview

Sistem SmartBin telah direfactor untuk memindahkan **semua logika AI detection** dari frontend ke backend. Ini mengikuti best practice untuk aplikasi AI modern dengan memisahkan concerns antara UI dan processing.

## Arsitektur Sebelumnya (Client-Side Detection)

### ❌ Masalah:
- Frontend melakukan processing AI (object detection & audio detection)
- Model weights harus di-download ke browser
- Performance tergantung pada device user
- API keys exposed di client
- Sulit untuk update model
- Tidak konsisten antar device

```
┌─────────────────────────────────────────┐
│           Frontend (Browser)            │
│  ┌───────────────────────────────────┐  │
│  │  Camera/Mic Capture               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Object Detection (TensorFlow.js) │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Audio Detection (TensorFlow.js)  │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Display Results                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Arsitektur Baru (Backend-First Detection)

### ✅ Keuntungan:
- Backend menangani semua AI processing
- Model di-host di cloud (Roboflow) atau server
- Performance konsisten untuk semua user
- API keys aman di server
- Mudah untuk update model
- Scalable dan maintainable

```
┌─────────────────────────────────────────┐
│           Frontend (Browser)            │
│  ┌───────────────────────────────────┐  │
│  │  Camera/Mic Capture               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Send to Backend (FormData)       │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Display Results                  │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │ HTTP POST
               │ (image + audio)
               ▼
┌─────────────────────────────────────────┐
│           Backend (Flask)               │
│  ┌───────────────────────────────────┐  │
│  │  Receive Request                  │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Visual Service                   │  │
│  │  (Roboflow Inference)             │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Audio Service                    │  │
│  │  (TensorFlow/Keras)               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Multimodal Fusion                │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  Return JSON Response             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Komponen Utama

### 1. Frontend (React)

**File**: `FrontEnd/src/pages/SmartbinDemo.jsx`

**Tanggung Jawab**:
- ✅ Capture video dari webcam
- ✅ Capture audio dari microphone
- ✅ Monitor audio RMS untuk trigger detection
- ✅ Send image + audio ke backend
- ✅ Display hasil deteksi
- ❌ ~~Tidak melakukan AI processing~~

**Key Functions**:
```javascript
// Capture image dari video stream
const captureImageBlob = async () => { ... }

// Encode audio ke WAV format
const encodeWav = (samples, sampleRate) => { ... }

// Kirim ke backend untuk detection
const runDetection = async ({ includeAudio = false }) => {
  const formData = new FormData();
  formData.append("image", imageBlob);
  formData.append("audio", audioBlob);
  
  const response = await fetch(`${API_BASE_URL}/api/predict/multimodal`, {
    method: "POST",
    body: formData,
  });
  
  const result = await response.json();
  // Display results...
}
```

### 2. Backend (Flask)

**File**: `BackEnd/app/routes/ai_routes.py`

**Endpoint**: `POST /api/predict/multimodal`

**Tanggung Jawab**:
- ✅ Receive image dan audio dari frontend
- ✅ Process dengan Visual Service (Roboflow)
- ✅ Process dengan Audio Service (TensorFlow)
- ✅ Combine hasil dari kedua modalitas
- ✅ Return hasil dalam format JSON

**Implementation**:
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

### 3. Visual Service (Roboflow Inference)

**File**: `BackEnd/app/services/visual_service.py`

**Tanggung Jawab**:
- ✅ Initialize Roboflow Inference client
- ✅ Process image dengan Roboflow API
- ✅ Normalize hasil deteksi
- ✅ Return bounding boxes dan labels

**Key Features**:
- Cloud-based inference (tidak perlu download model)
- Support untuk workflow (advanced pipelines)
- Automatic annotation pada gambar
- Fast dan scalable

**Implementation**:
```python
class VisualService:
    def __init__(self):
        self.client = InferenceHTTPClient(
            api_url=os.getenv("ROBOFLOW_API_URL"),
            api_key=os.getenv("ROBOFLOW_API_KEY")
        )
        self.model_id = os.getenv("ROBOFLOW_MODEL_ID")
    
    def detect_from_file_bytes(self, image_bytes):
        result = self.client.infer(image_bytes, model_id=self.model_id)
        return self._normalize_result(result)
```

### 4. Audio Service (TensorFlow)

**File**: `BackEnd/app/services/audio_service.py`

**Tanggung Jawab**:
- ✅ Load TensorFlow model dan label encoder
- ✅ Extract MFCC features dari audio
- ✅ Predict dengan model
- ✅ Return label dan confidence

**Implementation**:
```python
class AudioService:
    def __init__(self):
        self.model = load_model("ml_models/audio/.../model.h5")
        self.label_encoder = joblib.load("ml_models/audio/.../label_encoder.pkl")
    
    def predict(self, audio_bytes):
        # Extract MFCC features
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        features = np.mean(mfcc.T, axis=0)
        
        # Predict
        preds = self.model.predict(np.expand_dims(features, axis=0))
        
        # Get label
        top_idx = np.argmax(preds)
        label = self.label_encoder.inverse_transform([top_idx])[0]
        
        return {"label": label, "confidence": float(np.max(preds))}
```

## Data Flow

### 1. User Interaction
```
User → Camera/Mic → Browser captures media
```

### 2. Audio Trigger
```
Browser monitors RMS → Threshold exceeded → Trigger detection
```

### 3. Capture & Send
```
Browser captures:
  - Image (JPEG, 640px max width)
  - Audio (WAV, last 2-3 seconds)

Browser sends FormData:
  POST /api/predict/multimodal
  - image: Blob
  - audio: Blob
```

### 4. Backend Processing
```
Backend receives request
  ↓
Visual Service (Roboflow)
  - Infer with cloud API
  - Get detections + annotated image
  ↓
Audio Service (TensorFlow)
  - Extract MFCC features
  - Predict with local model
  ↓
Combine results
  - Pick highest confidence
  - Return JSON response
```

### 5. Display Results
```
Frontend receives JSON
  ↓
Update UI:
  - Show annotated image
  - Display detected label
  - Show confidence scores
  - Show audio classification
```

## API Request/Response Format

### Request
```http
POST /api/predict/multimodal HTTP/1.1
Host: localhost:5000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="image"; filename="frame.jpg"
Content-Type: image/jpeg

[binary image data]
------WebKitFormBoundary
Content-Disposition: form-data; name="audio"; filename="sample.wav"
Content-Type: audio/wav

[binary audio data]
------WebKitFormBoundary--
```

### Response
```json
{
  "visual": {
    "label": "Plastic",
    "confidence": 0.95,
    "detections": [
      {
        "label": "Plastic",
        "confidence": 0.95,
        "bbox": {
          "x": 320.5,
          "y": 240.0,
          "width": 100.0,
          "height": 150.0
        }
      }
    ],
    "annotated_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  },
  "audio": {
    "label": "Plastic",
    "confidence": 0.87,
    "probabilities": [0.05, 0.03, 0.87, 0.05]
  },
  "final_decision": "Plastic",
  "confidence_score": 0.95,
  "errors": null
}
```

## Roboflow Inference Workflow

### 1. Training (Cloud)
```
Roboflow Dashboard
  ↓
Upload & Annotate Images
  ↓
Train Model (Cloud GPU)
  ↓
Deploy Model (Get Model ID)
```

### 2. Deployment (Local Server)
```
Backend Server
  ↓
Initialize InferenceHTTPClient
  - API Key
  - Model ID
  ↓
Send Image to Roboflow API
  ↓
Receive Predictions
  ↓
Return to Frontend
```

### Keuntungan:
- ✅ **No model download**: Model di-host di cloud
- ✅ **Fast inference**: Optimized cloud infrastructure
- ✅ **Easy updates**: Update model di dashboard, langsung available
- ✅ **Scalable**: Roboflow handles scaling
- ✅ **Version control**: Mudah switch antar versi model

## Configuration

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Backend (.env)
```env
# Roboflow
ROBOFLOW_API_KEY=your-api-key-here
ROBOFLOW_MODEL_ID=garbage-2mxmf

# Optional: Workflow
ROBOFLOW_WORKFLOW_ID=active-learning
ROBOFLOW_WORKFLOW_WORKSPACE=your-workspace

# Database
DATABASE_URL=postgresql://...
```

## Performance Optimizations

### Frontend
1. **Downscale images**: Max 640px width untuk reduce bandwidth
2. **JPEG compression**: 80% quality untuk balance size/quality
3. **Audio buffering**: Keep last 5 seconds untuk quick capture
4. **Debouncing**: 3s untuk audio, 2.5s untuk visual
5. **Baseline RMS**: Dynamic threshold based on ambient noise

### Backend
1. **Roboflow cloud**: Fast inference dengan cloud GPU
2. **Async processing**: Non-blocking untuk multiple requests
3. **Error handling**: Graceful degradation jika salah satu service fail
4. **Caching**: (Future) Cache hasil untuk identical inputs

## Security

### Frontend
- ✅ No API keys exposed
- ✅ No model weights in browser
- ✅ CORS configured untuk specific origins

### Backend
- ✅ API keys di environment variables
- ✅ Input validation untuk file uploads
- ✅ File size limits
- ✅ Rate limiting (Future)

## Future Enhancements

1. **WebSocket streaming**: Real-time detection tanpa polling
2. **Batch processing**: Process multiple frames sekaligus
3. **Model caching**: Cache model di memory untuk faster inference
4. **Result caching**: Cache hasil untuk identical inputs
5. **A/B testing**: Test multiple models simultaneously
6. **Analytics**: Track detection accuracy dan performance metrics

## Migration Checklist

- [x] Move object detection logic to backend
- [x] Move audio detection logic to backend
- [x] Implement multimodal endpoint
- [x] Update frontend to use backend API
- [x] Add Roboflow Inference integration
- [x] Update documentation
- [ ] Add error monitoring
- [ ] Add performance monitoring
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Deploy to production

## Resources

- **Roboflow Setup Guide**: `BackEnd/ROBOFLOW_SETUP.md`
- **Backend README**: `BackEnd/README.md`
- **Roboflow Docs**: https://docs.roboflow.com/
- **Inference SDK**: https://github.com/roboflow/inference
