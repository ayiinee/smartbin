# SmartBin Backend

Flask API untuk SmartBin: deteksi visual (Roboflow) dan klasifikasi audio (MFCC + Keras).

## Persyaratan

- Python 3.10+
- Dependencies: lihat `requirements.txt`

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
3. Isi `GEMINI_API_KEY` (wajib untuk fitur Gemini AI Analyst)
4. Model audio ada di `ml_models/audio/smartbin_audio_v1/`

## Seeder (Data Dummy)

Script seeder massal untuk kebutuhan visualisasi dan laporan:

```bash
cd BackEnd
python seed_bulk.py --days 180 --logs-per-day 20
```

Opsi penting:
- `--days` jumlah hari data historis
- `--logs-per-day` jumlah log per hari
- `--bin-count` jumlah smartbin jika tabel masih kosong
- `--anomalies-ratio` proporsi data anomali
- `--no-carbon` skip carbon metrics

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

Server berjalan di `http://localhost:5000`

## Endpoint

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | Health check |
| POST | `/api/predict/visual` | Deteksi objek dari gambar (file atau base64) |
| POST | `/api/predict/audio` | Klasifikasi audio (file atau base64) |

## Struktur

```
BackEnd/
├── app.py              # Entry point
├── wsgi.py             # WSGI untuk production (gunicorn wsgi:app)
├── app/
│   ├── __init__.py     # create_app()
│   ├── routes/
│   │   └── ai_routes.py
│   └── services/
│       ├── audio_service.py   # MFCC + Keras
│       └── visual_service.py # Roboflow inference
└── ml_models/
    └── audio/
        └── smartbin_audio_v1/
            ├── audio_classification_model.h5  # atau model.h5
            ├── label_encoder.pkl
            └── metadata.json
```
