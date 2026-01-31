import os
from inference import get_model
from PIL import Image
from pathlib import Path

class VisionService:
    def __init__(self):
        # Gunakan Model ID dan API Key kamu
        self.model_id = "garbage-2mxmf-8awcq/2"
        self.api_key = os.getenv("ROBOFLOW_API_KEY") # Simpan di .env
        
        # Load model secara lokal menggunakan Inference SDK
        # Ini akan mendownload model ke cache komputer kamu saat pertama kali dipanggil
        self.model = get_model(model_id=self.model_id, api_key=self.api_key)

    def predict_garbage(self, image_path: str):
        """Melakukan deteksi sampah menggunakan Local Inference SDK"""
        # Melakukan prediksi (Berjalan di hardware lokal kamu)
        results = self.model.infer(image_path)[0]
        
        # Cari prediksi dengan confidence tertinggi
        predictions = results.predictions
        if predictions:
            # Urutkan berdasarkan confidence tertinggi
            top_pred = max(predictions, key=lambda x: x.confidence)
            
            return {
                "label": top_pred.class_name,
                "confidence": float(top_pred.confidence),
                "status": "success"
            }
            
        return {"label": "none", "confidence": 0.0, "status": "no_detection"}

# Singleton instance untuk aplikasi Flask
_VISION_SERVICE = None

def get_vision_service():
    global _VISION_SERVICE
    if _VISION_SERVICE is None:
        _VISION_SERVICE = VisionService()
    return _VISION_SERVICE