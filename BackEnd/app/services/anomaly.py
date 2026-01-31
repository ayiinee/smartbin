import os
import shutil
from pathlib import Path
from datetime import datetime
from app.extensions import db
from app.db_models.models import AnomalyData

# Tentukan path direktori
BASE_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BASE_DIR / "app" / "storage"
ANOMALY_DIR = STORAGE_DIR / "anomaly_uploads"

# Pastikan direktori anomaly ada
if not ANOMALY_DIR.exists():
    ANOMALY_DIR.mkdir(parents=True, exist_ok=True)

def flag_for_human_review(waste_log_id: int, image_path: str, confidence_score: float) -> str:
    """
    Menandai data sebagai anomali jika skor fusi < 60%.
    Menyimpan data ke tabel anomaly_data dan memindahkan file gambar.
    """
    
    # 1. Cek ambang batas confidence (opsional jika sudah difilter pemanggil, tapi aman untuk doubly check)
    if confidence_score >= 0.6:
        # Jika bukan anomali, tidak perlu diproses di sini
        return "Not an anomaly"

    try:
        # 2. Proses pemindahan file gambar
        source_path = Path(image_path)
        if not source_path.exists():
            return f"Error: Source image not found at {image_path}"

        # Buat nama file unik: timestamp_logid_originalmetrics
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = source_path.name
        new_filename = f"anomaly_{timestamp}_{waste_log_id}_{filename}"
        destination_path = ANOMALY_DIR / new_filename

        # Copy file (agar source di temp bisa dihapus atau di-retain sesuai kebijakan lain)
        # Menggunakan shutil.copy2 untuk mempertahankan metadata
        shutil.copy2(source_path, destination_path)

        # Path relatif untuk disimpan di DB atau path absolut (disesuaikan dengan kebutuhan serving file)
        # Disini kita simpan path absolut atau relatif terhadap project root
        final_image_path = str(destination_path)

        # 3. Simpan record ke Database
        anomaly_entry = AnomalyData(
            waste_log_id=waste_log_id,
            image_path=final_image_path,
            status_verified=False,
            user_label=None # Belum ada input user saat sistem menandai otomatis
        )

        db.session.add(anomaly_entry)
        db.session.commit()

        return f"Success: Flagged as anomaly. Image saved to {new_filename}"

    except Exception as e:
        db.session.rollback()
        return f"Failed to process anomaly: {str(e)}"
