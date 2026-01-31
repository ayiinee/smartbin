import os
import tempfile
from typing import Optional, Tuple

import joblib
import numpy as np
import streamlit as st

try:
    import librosa
except ImportError as e:
    librosa = None


# Path relatif ke folder models di dalam project
# Model akan di-load dari folder 'models' yang ada di root project
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
ISOLATION_FOREST_PATH = os.path.join(MODELS_DIR, "isolation_forest_model.joblib")
ONE_CLASS_SVM_PATH = os.path.join(MODELS_DIR, "one_class_svm_model.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.joblib")
PCA_PATH = os.path.join(MODELS_DIR, "pca.joblib")


def preprocess_audio(
    audio_path: str,
    target_sr: int = 22050,
    duration: float = 3.0,
    normalize: bool = True,
) -> Tuple[np.ndarray, int]:
    """
    Load, resample, trim/pad, and optionally normalize an audio file.

    Parameters
    ----------
    audio_path : str
        Path to the audio file.
    target_sr : int
        Target sampling rate.
    duration : float
        Desired fixed duration in seconds.
    normalize : bool
        If True, apply zero-mean, unit-variance normalization.
    """
    if librosa is None:
        raise ImportError(
            "librosa is not installed. Please install it with 'pip install librosa'."
        )

    y, sr = librosa.load(audio_path, sr=target_sr, mono=True)

    # Fix length to target duration (trim or pad with zeros)
    target_length = int(target_sr * duration)
    y = librosa.util.fix_length(y, size=target_length)

    if normalize:
        mean = np.mean(y)
        std = np.std(y) + 1e-9
        y = (y - mean) / std

    return y, target_sr


def extract_features(
    y: np.ndarray,
    sr: int,
    n_mfcc: int = 13,
    hop_length: int = 512,
    n_fft: int = 2048,
) -> np.ndarray:
    """
    Extract MFCC features and summarize them with mean and std.

    Returns
    -------
    features : np.ndarray, shape (2 * n_mfcc,)
        Concatenation of mean and std of each MFCC coefficient.
    """
    if librosa is None:
        raise ImportError(
            "librosa is not installed. Please install it with 'pip install librosa'."
        )

    mfccs = librosa.feature.mfcc(
        y=y, sr=sr, n_mfcc=n_mfcc, hop_length=hop_length, n_fft=n_fft
    )
    mfccs_mean = np.mean(mfccs, axis=1)
    mfccs_std = np.std(mfccs, axis=1)
    features = np.concatenate([mfccs_mean, mfccs_std], axis=0)
    return features


def predict_audio(
    filepath: str,
    isolation_forest,
    one_class_svm,
    scaler,
    pca: Optional[object] = None,
) -> dict:
    """
    Predict whether the audio is a 'bottle' (normal) or 'anomaly'.

    This function assumes all models/transformers are pre-loaded and passed in.
    """
    y, sr = preprocess_audio(filepath)
    features = extract_features(y, sr)

    X = features.reshape(1, -1)
    X_scaled = scaler.transform(X)

    if pca is not None:
        X_final = pca.transform(X_scaled)
    else:
        X_final = X_scaled

    # Anomaly scores (higher is more normal for scikit-learn one-class models)
    iso_score = float(isolation_forest.decision_function(X_final)[0])
    svm_score = float(one_class_svm.decision_function(X_final)[0])

    # Predictions: 1 = inlier (normal), -1 = outlier (anomaly)
    iso_pred = int(isolation_forest.predict(X_final)[0])
    svm_pred = int(one_class_svm.predict(X_final)[0])

    # Simple fusion rule: require both models to agree on "normal" to call it bottle
    if iso_pred == 1 and svm_pred == 1:
        label = "bottle"
    else:
        label = "anomaly"

    return {
        "label": label,
        "isolation_forest_score": iso_score,
        "one_class_svm_score": svm_score,
        "isolation_forest_pred": iso_pred,
        "one_class_svm_pred": svm_pred,
    }


@st.cache_resource(show_spinner=False)
def load_models():
    """
    Load pre-trained models and transformers from the specified directory.

    Returns
    -------
    isolation_forest, one_class_svm, scaler, pca_or_none
    """
    if not os.path.exists(ISOLATION_FOREST_PATH):
        raise FileNotFoundError(
            f"Isolation Forest model not found at '{ISOLATION_FOREST_PATH}'."
        )
    if not os.path.exists(ONE_CLASS_SVM_PATH):
        raise FileNotFoundError(
            f"One-Class SVM model not found at '{ONE_CLASS_SVM_PATH}'."
        )
    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"Scaler not found at '{SCALER_PATH}'.")

    isolation_forest = joblib.load(ISOLATION_FOREST_PATH)
    one_class_svm = joblib.load(ONE_CLASS_SVM_PATH)
    scaler = joblib.load(SCALER_PATH)

    pca = None
    if os.path.exists(PCA_PATH):
        pca = joblib.load(PCA_PATH)

    return isolation_forest, one_class_svm, scaler, pca


def render_header():
    st.set_page_config(
        page_title="Audio Anomaly Detection - Bottle Classifier",
        page_icon="🔊",
        layout="centered",
    )

    st.markdown(
        """
        <style>
        .main-title {
            font-size: 2.4rem;
            font-weight: 700;
            color: #1F2933;
            text-align: center;
            margin-bottom: 0.2rem;
        }
        .subtitle {
            font-size: 1rem;
            color: #52606D;
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .result-card {
            border-radius: 0.8rem;
            padding: 1rem 1.2rem;
            margin-top: 0.8rem;
        }
        .result-bottle {
            background: #E3F9E5;
            border: 1px solid #57AE5B;
        }
        .result-anomaly {
            background: #FFE3E3;
            border: 1px solid #E12D39;
        }
        .result-label {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 0.2rem;
        }
        .result-detail {
            font-size: 0.9rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown('<div class="main-title">Audio Anomaly Detection</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="subtitle">Classify uploaded audio as a bottle sound or an anomaly using one-class models.</div>',
        unsafe_allow_html=True,
    )


def classify_and_display(file, models):
    isolation_forest, one_class_svm, scaler, pca = models

    file_name = file.name
    suffix = os.path.splitext(file_name)[1].lower()
    if suffix == "":
        suffix = ".wav"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.getbuffer())
            tmp_path = tmp.name
    except Exception as e:
        st.error(f"Failed to save uploaded file '{file_name}': {e}")
        return

    try:
        result = predict_audio(
            filepath=tmp_path,
            isolation_forest=isolation_forest,
            one_class_svm=one_class_svm,
            scaler=scaler,
            pca=pca,
        )
    except Exception as e:
        st.error(f"Error during prediction for '{file_name}': {e}")
        return
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    label = result["label"]
    iso_score = result["isolation_forest_score"]
    svm_score = result["one_class_svm_score"]

    if label == "bottle":
        css_class = "result-bottle"
        label_text = "This is a bottle sound (normal)."
    else:
        css_class = "result-anomaly"
        label_text = "This is an anomaly."

    st.markdown(
        f"""
        <div class="result-card {css_class}">
            <div class="result-label">{label_text}</div>
            <div class="result-detail">
                <b>File:</b> {file_name}<br/>
                <b>IsolationForest score:</b> {iso_score:.4f}<br/>
                <b>OneClassSVM score:</b> {svm_score:.4f}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def main():
    render_header()

    if librosa is None:
        st.error(
            "The 'librosa' library is required but not installed. "
            "Please install it with `pip install librosa` and restart the app."
        )
        return

    with st.sidebar:
        st.markdown("### Settings")
        st.markdown("Upload one or more audio files in formats such as WAV, FLAC, or MP3.")

    with st.spinner("Loading models..."):
        try:
            models = load_models()
        except Exception as e:
            st.error(f"Failed to load models: {e}")
            return

    st.markdown("### Upload Audio")
    uploaded_files = st.file_uploader(
        "Choose audio file(s)",
        type=["wav", "flac", "mp3", "ogg", "m4a"],
        accept_multiple_files=True,
    )

    if uploaded_files:
        for file in uploaded_files:
            classify_and_display(file, models)
    else:
        st.info("Please upload at least one audio file to start the analysis.")


if __name__ == "__main__":
    main()

