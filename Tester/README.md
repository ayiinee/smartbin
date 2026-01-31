# AudioDetectionBottle (Realtime Microphone Trigger)

This project supports **real-time microphone event triggering**:
- The browser **listens** to mic amplitude (RMS).
- When it exceeds a **threshold**, it **records exactly 2 seconds**.
- The 2-second audio blob is sent to the backend for classification.

**Statistics Dashboard**: Each detection is stored in SQLite. A dedicated dashboard shows aggregate stats, distribution by label, confidence charts, and recent detection history.

## Files

- `frontend/index.html`: Web Audio API realtime trigger + UI.
- `frontend/dashboard.html`: Statistics Dashboard (Chart.js pie/bar charts, recent history table).
- `backend/main.py`: FastAPI endpoints `/predict-audio`, `/api/stats`, `/health`. Prediksi memakai **Isolation Forest + One-Class SVM** dari `models/` (sama dengan Streamlit).
- `backend/database.py`: SQLAlchemy + SQLite model `PredictionLog`, DB init.
- `data/predictions.db`: SQLite database (created on first run).

## Run (Windows / local)

### 1) Backend (FastAPI)

From project root:

```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Or install dependencies manually:

```bash
pip install fastapi uvicorn numpy librosa soundfile audioread joblib scikit-learn sqlalchemy
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Pages:
- `http://localhost:8000/` or `/av.html` - **Audio + Visual**
- `http://localhost:8000/audio.html` - **Audio Only**
- `http://localhost:8000/visual.html` - **Visual Only**
- `http://localhost:8000/dashboard.html` - **Statistics Dashboard**

Endpoints:
- `http://localhost:8000/health` - health check
- `http://localhost:8000/predict-audio` - POST audio for classification (results saved to DB)
- `http://localhost:8000/api/stats` - GET aggregated stats for the dashboard
- `http://localhost:8000/api/visual-detect-server` - GET visual detection from server webcam
- `http://localhost:8000/docs` - interactive API docs

## Roboflow Latest API (Streaming + Local Pipeline)

This repo already uses `inference-sdk` for single-image visual detection in
`backend/visual_service.py`. For realtime video streaming or local workflow
pipelines, use these examples:

- `examples/roboflow_webrtc_stream.py` (serverless WebRTC streaming)
- `examples/roboflow_local_pipeline.py` (local inference pipeline)

Install dependencies:

```powershell
pip install "inference-sdk[webrtc]" opencv-python
pip install inference opencv-python
```

Set environment variables (PowerShell):

```powershell
$env:ROBOFLOW_API_KEY="YOUR_KEY"
$env:ROBOFLOW_WORKSPACE="ay-ubww8"
$env:ROBOFLOW_WORKFLOW_ID="active-learning"
$env:ROBOFLOW_IMAGE_INPUT="image"
```

Optional overrides (must match your workflow inputs/outputs):

```powershell
$env:ROBOFLOW_STREAM_OUTPUT="output_image"
$env:ROBOFLOW_DATA_OUTPUT="predictions"
$env:ROBOFLOW_PLAN="webrtc-gpu-medium"
$env:ROBOFLOW_REGION="us"
$env:ROBOFLOW_TIMEOUT_SEC="600"
```

Run:

```powershell
python examples/roboflow_webrtc_stream.py
python examples/roboflow_local_pipeline.py
```

Enable workflow inference inside the backend (optional):

```powershell
$env:ROBOFLOW_WORKSPACE_NAME="ay-ubww8"
$env:ROBOFLOW_WORKFLOW_ID="active-learning"
$env:ROBOFLOW_WORKFLOW_IMAGE_INPUT="image"
```

If `ROBOFLOW_WORKFLOW_ID` + `ROBOFLOW_WORKSPACE_NAME` are set, visual endpoints
(`/predict-visual`, `/visual/frame`, `/visual/stream`, `/api/visual-detect-server`,
and the visual portion of multimodal endpoints) will use the workflow output.

### 2) Frontend

**Buka di browser:** `http://localhost:8000/` (Chrome/Edge disarankan).

- **Detection**: Halaman utama. Klik **Start Listening**, buat suara (mis. botol), audio dikirim ke backend dan hasil disimpan.
- **Dashboard**: Klik **Statistics Dashboard →** di header, atau buka `http://localhost:8000/dashboard.html`. Klik **Load stats** untuk memuat grafik dan riwayat.

Frontend disajikan oleh backend; API URL otomatis mengikuti origin saat diakses lewat `localhost:8000`.

## Persiapan: FFmpeg (wajib untuk WebM/Opus dari browser)

Browser merekam mikrophone sebagai **audio/webm** (Opus). Backend memakai **ffmpeg** (via audioread) untuk decode format ini.

**Tanpa ffmpeg** Anda akan dapat error:
`Could not decode audio... Format not recognised` / `Install ffmpeg, add it to PATH`.

### Install FFmpeg di Windows

1. **Via Winget (disarankan)**  
   Buka PowerShell lalu:
   ```powershell
   winget install ffmpeg
   ```
   Setelah selesai, tutup dan buka lagi terminal (atau restart PC) agar PATH ter-update.

2. **Via Chocolatey**  
   Jika sudah pakai Chocolatey:
   ```powershell
   choco install ffmpeg
   ```

3. **Manual**
   - Download build Windows: https://www.gyan.dev/ffmpeg/builds/ (ambil **ffmpeg-release-essentials**).
   - Ekstrak ke folder, misalnya `C:\ffmpeg`.
   - Tambahkan `C:\ffmpeg\bin` ke **PATH** (System Properties → Environment Variables → Path → Edit → New).

### Cek instalasi

```powershell
ffmpeg -version
```

Jika perintah dikenali, ffmpeg siap dipakai. **Restart backend** (uvicorn) setelah ffmpeg ter-install.

---

## Catatan format audio

Browser biasanya merekam `audio/webm` (Opus) atau `audio/ogg`. Decode memakai soundfile (WAV/FLAC/dll.) dan, jika gagal, fallback ke **librosa + audioread + ffmpeg** untuk WebM/OGG.

---

Machine Learning for Trash Audio Detection
