# Folder Models

Letakkan file-file model berikut di folder ini:

## File yang Diperlukan:
- `isolation_forest_model.joblib` - Model Isolation Forest
- `one_class_svm_model.joblib` - Model One-Class SVM  
- `scaler.joblib` - StandardScaler yang sudah di-fit

## File Opsional:
- `pca.joblib` - PCA transformer (jika ada)

## Cara Menambahkan Model:
1. Copy semua file `.joblib` yang sudah Anda train ke folder ini
2. Pastikan nama file sesuai dengan yang tercantum di atas
3. Jalankan aplikasi Streamlit dengan: `streamlit run audio_anomaly_streamlit_app.py`

Aplikasi akan otomatis memuat model dari folder ini tanpa perlu koneksi ke Google Colab.
