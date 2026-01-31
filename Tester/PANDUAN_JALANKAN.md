# 📋 Panduan Menjalankan AudioDetectionBottle

Panduan lengkap untuk menjalankan aplikasi deteksi suara botol secara real-time.

## ✅ Prasyarat

1. **Python 3.8+** (disarankan Python 3.10 atau lebih baru)
2. **FFmpeg** (wajib untuk decode audio dari browser)
3. **Model files** sudah ada di folder `models/`:
   - `isolation_forest_model.joblib`
   - `one_class_svm_model.joblib`
   - `scaler.joblib`
   - `pca.joblib` (opsional)

---

## 🚀 Langkah 1: Install FFmpeg (Wajib!)

Browser merekam audio sebagai **WebM/Opus**, dan backend memerlukan FFmpeg untuk decode format ini.

### Opsi A: Via Winget (Paling Mudah - Windows 10/11)

Buka **PowerShell** sebagai Administrator:

```powershell
winget install ffmpeg
```

Setelah selesai, **tutup dan buka lagi terminal** (atau restart PC) agar PATH ter-update.

### Opsi B: Via Chocolatey

Jika sudah punya Chocolatey:

```powershell
choco install ffmpeg
```

### Opsi C: Manual Download

1. Download dari: https://www.gyan.dev/ffmpeg/builds/
2. Pilih **ffmpeg-release-essentials.zip**
3. Ekstrak ke folder, misalnya `C:\ffmpeg`
4. Tambahkan `C:\ffmpeg\bin` ke **PATH**:
   - Buka **System Properties** → **Environment Variables**
   - Edit **Path** → **New** → Tambahkan `C:\ffmpeg\bin`
   - Klik **OK** pada semua dialog

### Verifikasi FFmpeg

Buka terminal baru dan jalankan:

```powershell
ffmpeg -version
```

Jika muncul informasi versi FFmpeg, berarti sudah berhasil!

---

## 🐍 Langkah 2: Setup Python Environment (Opsional tapi Disarankan)

Disarankan menggunakan virtual environment untuk menghindari konflik dependency.

### Buat Virtual Environment

```powershell
# Di folder project
python -m venv venv
```

### Aktifkan Virtual Environment

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
venv\Scripts\activate.bat
```

**Git Bash:**
```bash
source venv/Scripts/activate
```

Setelah aktif, prompt akan menampilkan `(venv)` di depan.

---

## 📦 Langkah 3: Install Dependencies

Pastikan Anda berada di **root folder project** (`AudioDetectionBottle`).

### Install dari requirements.txt

```powershell
pip install -r requirements.txt
```

### Atau install manual

```powershell
pip install fastapi uvicorn numpy librosa soundfile audioread joblib scikit-learn sqlalchemy
```

**Catatan:** Jika ada error saat install `librosa`, mungkin perlu install Visual C++ Build Tools atau gunakan pre-built wheel.

---

## 🎯 Langkah 4: Verifikasi Model Files

Pastikan semua file model ada di folder `models/`:

```powershell
# Cek isi folder models
dir models
```

Harus ada:
- ✅ `isolation_forest_model.joblib`
- ✅ `one_class_svm_model.joblib`
- ✅ `scaler.joblib`
- ✅ `pca.joblib` (opsional)

Jika ada yang kurang, aplikasi akan error saat startup.

---

## 🖥️ Langkah 5: Jalankan Backend Server

Pastikan Anda berada di **root folder project** dan virtual environment sudah aktif (jika menggunakan).

### Jalankan dengan Uvicorn

```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Atau dengan reload otomatis (untuk development):

```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Output yang Diharapkan

```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Jangan tutup terminal ini!** Server harus tetap berjalan.

---

## 🌐 Langkah 6: Buka Aplikasi di Browser

Setelah backend berjalan, buka browser (Chrome/Edge disarankan) dan akses:

### Halaman Utama (Detection)
```
http://localhost:8000/
```

### Dashboard Statistik
```
http://localhost:8000/dashboard.html
```

### API Documentation (Swagger)
```
http://localhost:8000/docs
```

### Health Check
```
http://localhost:8000/health
```

### Analisis Model (Baru!)
```
http://localhost:8000/api/model-analysis
```

---

## 🎤 Langkah 7: Menggunakan Aplikasi

### Detection Page (`http://localhost:8000/`)

1. **Klik "Start Listening"**
   - Browser akan meminta izin akses mikrofon
   - Klik **Allow** untuk memberikan izin

2. **Buat Suara**
   - Bicara atau buat suara botol
   - Aplikasi akan otomatis mendeteksi ketika suara melebihi threshold
   - Audio 2 detik akan direkam dan dikirim ke backend

3. **Lihat Hasil**
   - Hasil klasifikasi akan muncul di layar
   - Data tersimpan otomatis ke database

### Dashboard (`http://localhost:8000/dashboard.html`)

1. **Klik "Load stats"**
2. Lihat statistik:
   - Total deteksi
   - Distribusi label (bottle vs anomaly)
   - Grafik confidence
   - Riwayat deteksi terbaru

---

## 🔧 Troubleshooting

### Error: "Could not decode audio... Install ffmpeg"

**Solusi:**
- Pastikan FFmpeg sudah terinstall dan ada di PATH
- Restart terminal setelah install FFmpeg
- Restart backend server setelah install FFmpeg
- Verifikasi dengan `ffmpeg -version`

### Error: "Model not found"

**Solusi:**
- Pastikan semua file `.joblib` ada di folder `models/`
- Cek path folder `models/` relatif terhadap `backend/main.py`

### Error: "Permission denied" untuk mikrofon

**Solusi:**
- Pastikan browser sudah memberikan izin akses mikrofon
- Cek pengaturan browser untuk izin mikrofon
- Gunakan HTTPS atau localhost (bukan file://)

### Error saat install librosa

**Solusi:**
```powershell
# Coba install dengan pip upgrade
pip install --upgrade pip
pip install librosa

# Atau install dengan wheel
pip install librosa --only-binary :all:
```

### Port 8000 sudah digunakan

**Solusi:**
- Tutup aplikasi lain yang menggunakan port 8000
- Atau gunakan port lain:
  ```powershell
  uvicorn backend.main:app --host 0.0.0.0 --port 8001
  ```
  Lalu akses `http://localhost:8001`

### Database tidak dibuat

**Solusi:**
- Database akan dibuat otomatis saat pertama kali backend dijalankan
- Pastikan folder `data/` ada dan bisa ditulis
- Cek file `data/predictions.db` setelah menjalankan backend

---

## 📊 Endpoint API yang Tersedia

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/` | GET | Halaman utama (Detection UI) |
| `/dashboard.html` | GET | Dashboard statistik |
| `/health` | GET | Health check |
| `/predict-audio` | POST | Upload audio untuk klasifikasi |
| `/api/stats` | GET | Statistik agregat |
| `/api/model-analysis` | GET | Analisis parameter model |
| `/docs` | GET | Dokumentasi API interaktif |

---

## 🛑 Menghentikan Server

Tekan **CTRL+C** di terminal tempat backend berjalan.

---

## 📝 Catatan Penting

1. **FFmpeg wajib** untuk decode audio WebM dari browser
2. **Model files** harus ada sebelum menjalankan backend
3. **Browser** harus memberikan izin akses mikrofon
4. **Database** dibuat otomatis di `data/predictions.db`
5. Semua deteksi tersimpan otomatis ke database untuk statistik

---

## 🎓 Langkah Selanjutnya

Setelah aplikasi berjalan:

1. **Uji dengan berbagai suara** untuk melihat akurasi model
2. **Cek dashboard** untuk melihat statistik deteksi
3. **Analisis model** di `/api/model-analysis` untuk melihat parameter
4. **Sesuaikan threshold** di `backend/main.py` jika perlu (baris 293-294)

---

## 💡 Tips

- Gunakan **Chrome atau Edge** untuk hasil terbaik
- **Restart backend** setelah mengubah kode
- **Cek console browser** (F12) untuk melihat error JavaScript
- **Cek terminal backend** untuk melihat error Python
- Gunakan **virtual environment** untuk menghindari konflik dependency

---

**Selamat mencoba! 🎉**

Jika ada masalah, cek bagian Troubleshooting atau buka issue di repository.
