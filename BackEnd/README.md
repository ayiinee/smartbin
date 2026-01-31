# SmartBin Backend

Flask API untuk SmartBin dengan **deteksi multimodal**: 
- **Visual Detection**: Menggunakan Roboflow Inference untuk deteksi objek
- **Audio Detection**: Menggunakan TensorFlow/Keras untuk klasifikasi suara

## Arsitektur

Backend menangani **semua logika AI detection**, termasuk:
- Object detection menggunakan Roboflow Inference (cloud-based)
- Audio classification menggunakan TensorFlow model (local)
- Multimodal fusion untuk hasil deteksi yang lebih akurat

Frontend hanya bertanggung jawab untuk:
- Capture video/audio dari browser
- Mengirim data ke backend
- Menampilkan hasil deteksi

## Persyaratan

- Python 3.10+
- Dependencies: lihat `requirements.txt`
- Roboflow API Key (gratis di https://app.roboflow.com/)

## Instalasi

```bash
cd BackEnd
pip install -r requirements.txt
```

Jika ada error permission, gunakan virtual environment:

```bash
python -m venv venv
venv\Scripts\activate   # Windows
# atau: source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## Konfigurasi

1. Salin `.env.example` ke `.env`
2. Isi `ROBOFLOW_API_KEY` (wajib untuk endpoint visual)
   - Dapatkan API key di: https://app.roboflow.com/
   - Lihat panduan lengkap di `ROBOFLOW_SETUP.md`
3. Model audio ada di `ml_models/audio/smartbin_audio_v1/`

### Setup Roboflow Inference

Untuk panduan lengkap tentang setup dan penggunaan Roboflow Inference, lihat:
**[ROBOFLOW_SETUP.md](./ROBOFLOW_SETUP.md)**

Panduan tersebut mencakup:
- Cara mendapatkan API Key
- Identifikasi Model ID
- Implementasi untuk gambar statis dan video real-time
- Troubleshooting

## Menjalankan

**Opsi 1 – Langsung:**
```bash
cd BackEnd
python app.py
```

**Opsi 2 – Flask CLI:**
```bash
cd BackEnd
set FLASK_APP=app.py
flask run
```

**Opsi 3 – PowerShell Script (Windows):**
```bash
cd BackEnd
.\run.ps1
```

Server berjalan di `http://localhost:5000`

## Endpoint API

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | Health check |
| POST | `/api/predict/visual` | Deteksi objek dari gambar (file atau base64) |
| POST | `/api/predict/audio` | Klasifikasi audio (file atau base64) |
| POST | `/api/predict/multimodal` | **Deteksi multimodal** (gambar + audio) |
| WS | `/api/stream/visual` | WebSocket untuk streaming video real-time |

### Multimodal Endpoint

Endpoint `/api/predict/multimodal` adalah endpoint utama yang digunakan oleh frontend. Endpoint ini menerima gambar dan/atau audio, kemudian mengembalikan hasil deteksi dari kedua modalitas.

**Request:**
```
POST /api/predict/multimodal
Content-Type: multipart/form-data

image: [file] (optional)
audio: [file] (optional)
```

**Response:**
```json
{
  "visual": {
    "label": "Plastic",
    "confidence": 0.95,
    "detections": [...],
    "annotated_image": "data:image/jpeg;base64,..."
  },
  "audio": {
    "label": "Plastic",
    "confidence": 0.87
  },
  "final_decision": "Plastic",
  "confidence_score": 0.95,
  "errors": null
}
```

## Struktur Project

```
BackEnd/
├── app.py                    # Entry point
├── wsgi.py                   # WSGI untuk production
├── run.ps1                   # PowerShell script untuk Windows
├── ROBOFLOW_SETUP.md        # Panduan setup Roboflow Inference
├── app/
│   ├── __init__.py          # create_app()
│   ├── config.py            # Configuration
│   ├── extensions.py        # Flask extensions
│   ├── routes/
│   │   └── ai_routes.py     # AI endpoints (visual, audio, multimodal)
│   ├── services/
│   │   ├── audio_service.py    # Audio classification (TensorFlow)
│   │   └── visual_service.py   # Object detection (Roboflow)
│   └── db_models/
│       └── models.py        # Database models
└── ml_models/
    └── audio/
        └── smartbin_audio_v1/
            ├── audio_classification_model.h5  # atau model.h5
            ├── label_encoder.pkl
            └── metadata.json
```

## Keuntungan Arsitektur Backend-First

1. **Separation of Concerns**: Frontend fokus pada UI/UX, backend fokus pada AI
2. **Scalability**: Mudah untuk scale backend secara independen
3. **Security**: API key dan model tidak exposed ke client
4. **Flexibility**: Mudah untuk mengganti model atau menambah modalitas baru
5. **Performance**: Processing dilakukan di server yang lebih powerful
6. **Consistency**: Semua client mendapat hasil yang sama (tidak tergantung device)

## Development

### Testing Endpoints

Gunakan curl atau Postman untuk testing:

```bash
# Test visual detection
curl -X POST http://localhost:5000/api/predict/visual \
  -F "file=@test_image.jpg"

# Test audio detection
curl -X POST http://localhost:5000/api/predict/audio \
  -F "file=@test_audio.wav"

# Test multimodal detection
curl -X POST http://localhost:5000/api/predict/multimodal \
  -F "image=@test_image.jpg" \
  -F "audio=@test_audio.wav"
```

## Troubleshooting

Lihat `ROBOFLOW_SETUP.md` untuk troubleshooting Roboflow Inference.

Untuk masalah umum:
- Pastikan semua dependencies terinstall
- Pastikan `.env` file sudah dikonfigurasi dengan benar
- Pastikan model audio ada di `ml_models/audio/smartbin_audio_v1/`
- Check logs untuk error messages
