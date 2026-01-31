from app.services.ai_vision import get_vision_service
from app.services.ai_audio import predict_audio
import logging

# Inisialisasi logging untuk audit sistem
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def perform_multimodal_fusion(image_path: str, audio_path: str = None):
    """
    Menggabungkan hasil deteksi Visual (70%) dan Audio (30%)
   
    """
    
    # 1. Dapatkan hasil dari Vision Service (YOLOv8)
    vision_service = get_vision_service()
    v_res = vision_service.predict_garbage(image_path)
    
    # 2. Dapatkan hasil dari Audio Service (.h5) jika ada audio
    # Jika tidak ada audio (sampah tidak bersuara/sensor gagal), audio_conf = 0
    if audio_path:
        a_res = predict_audio(audio_path)
    else:
        a_res = {"label": "none", "confidence": 0.0}

    # 3. Rumus Weighted Probability Fusion
    # Final_Score = (V_conf * 0.7) + (A_conf * 0.3)
    visual_weight = 0.7
    audio_weight = 0.3
    
    final_confidence = (v_res['confidence'] * visual_weight) + (a_res['confidence'] * audio_weight)

    # 4. Logika Penentuan Label Final
    # Jika kedua model setuju, label tersebut diambil.
    # Jika berbeda, ambil label dengan kontribusi probabilitas tertinggi (Weighted)
    if v_res['label'] == a_res['label']:
        final_label = v_res['label']
    else:
        # Menghitung probabilitas tertimbang untuk masing-masing label
        v_weighted = v_res['confidence'] * visual_weight
        a_weighted = a_res['confidence'] * audio_weight
        final_label = v_res['label'] if v_weighted >= a_weighted else a_res['label']

    # 5. Klasifikasi Status berdasarkan Threshold PRD
    if final_confidence >= 0.85:
        status = "high_confidence"
    elif final_confidence >= 0.60:
        status = "medium_confidence"
    else:
        status = "anomaly" # Memicu alur Active Learning/Human-in-the-Loop

    result = {
        "final_label": final_label,
        "final_confidence": round(final_confidence, 4),
        "status": status,
        "raw_data": {
            "visual": v_res,
            "audio": a_res
        },
        "weights": {
            "visual": visual_weight,
            "audio": audio_weight
        }
    }

    logger.info(f"Fusion Result: {final_label} ({status}) with score {final_confidence}")
    return result