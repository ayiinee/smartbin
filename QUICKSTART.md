# SmartBin Quick Start Guide

## Untuk Developer

### Setup Backend

1. **Install Dependencies**
```bash
cd BackEnd
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

2. **Configure Environment**
```bash
# Copy .env.example to .env
copy .env.example .env

# Edit .env dan isi:
# - ROBOFLOW_API_KEY (dapatkan di https://app.roboflow.com/)
# - DATABASE_URL (jika menggunakan database)
```

3. **Run Backend**
```bash
python app.py
# Server running at http://localhost:5000
```

### Setup Frontend

1. **Install Dependencies**
```bash
cd FrontEnd
npm install
```

2. **Configure Environment**
```bash
# Create .env file
echo VITE_API_BASE_URL=http://localhost:5000 > .env
```

3. **Run Frontend**
```bash
npm run dev
# App running at http://localhost:5173
```

### Test the System

1. **Open browser**: http://localhost:5173
2. **Allow camera/microphone access**
3. **Wait for baseline calibration** (2-3 seconds)
4. **Make a sound** (clap, knock, etc.) to trigger audio detection
5. **Show an object** to camera for visual detection

## Arsitektur Singkat

```
Frontend (React)          Backend (Flask)
     │                         │
     │  1. Capture Image       │
     │     + Audio             │
     │─────────────────────────▶
     │                         │
     │                    2. Process
     │                       Visual
     │                      (Roboflow)
     │                         │
     │                    3. Process
     │                       Audio
     │                    (TensorFlow)
     │                         │
     │  4. Return Results      │
     │◀─────────────────────────
     │                         │
     │  5. Display             │
     │                         │
```

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/predict/visual` | POST | Object detection only |
| `/api/predict/audio` | POST | Audio classification only |
| `/api/predict/multimodal` | POST | **Both** (used by frontend) |

## Environment Variables

### Backend (.env)
```env
# Required
ROBOFLOW_API_KEY=your-key-here
ROBOFLOW_MODEL_ID=garbage-2mxmf

# Optional
DATABASE_URL=postgresql://...
FLASK_ENV=development
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
```

## Common Issues

### Backend tidak bisa start
- ✅ Check Python version (3.10+)
- ✅ Check virtual environment activated
- ✅ Check all dependencies installed
- ✅ Check `.env` file exists

### Frontend tidak bisa connect ke backend
- ✅ Check backend is running
- ✅ Check `VITE_API_BASE_URL` in frontend `.env`
- ✅ Check CORS configuration in backend

### Camera/Mic tidak bisa access
- ✅ Allow browser permissions
- ✅ Use HTTPS or localhost
- ✅ Check browser console for errors

### Detection tidak jalan
- ✅ Check `ROBOFLOW_API_KEY` valid
- ✅ Check audio RMS threshold (adjust slider)
- ✅ Check backend logs for errors
- ✅ Check network tab for API calls

## Development Workflow

1. **Make changes** to code
2. **Test locally** dengan kedua server running
3. **Check browser console** untuk frontend errors
4. **Check terminal** untuk backend errors
5. **Test API** dengan curl/Postman jika perlu
6. **Commit** changes

## Useful Commands

### Backend
```bash
# Run server
python app.py

# Run with debug
FLASK_ENV=development python app.py

# Test endpoint
curl -X POST http://localhost:5000/api/predict/multimodal \
  -F "image=@test.jpg" \
  -F "audio=@test.wav"
```

### Frontend
```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## File Structure (Important Files)

```
smartbin/
├── BackEnd/
│   ├── app.py                          # Entry point
│   ├── .env                            # Configuration (create this)
│   ├── app/
│   │   ├── routes/ai_routes.py        # API endpoints
│   │   └── services/
│   │       ├── visual_service.py      # Roboflow integration
│   │       └── audio_service.py       # TensorFlow model
│   └── ml_models/audio/               # Audio model files
│
├── FrontEnd/
│   ├── .env                            # Configuration (create this)
│   └── src/
│       └── pages/
│           └── SmartbinDemo.jsx       # Main demo page
│
├── ARCHITECTURE.md                     # Detailed architecture docs
└── BackEnd/ROBOFLOW_SETUP.md          # Roboflow setup guide
```

## Next Steps

1. Read `ARCHITECTURE.md` untuk detailed explanation
2. Read `BackEnd/ROBOFLOW_SETUP.md` untuk Roboflow setup
3. Explore code di `SmartbinDemo.jsx` dan `ai_routes.py`
4. Test dengan different objects dan sounds
5. Customize detection thresholds dan parameters

## Support

- **Architecture**: See `ARCHITECTURE.md`
- **Roboflow**: See `BackEnd/ROBOFLOW_SETUP.md`
- **Backend**: See `BackEnd/README.md`
- **Issues**: Check browser console dan backend logs
