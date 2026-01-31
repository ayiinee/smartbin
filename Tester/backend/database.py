"""
SQLAlchemy + SQLite setup for prediction logging.
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Generator

from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

Base = declarative_base()


class PredictionLog(Base):
    """Stores each detection result for statistics and dashboard."""

    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    detected_label = Column(String(64), nullable=False, index=True)
    confidence_score = Column(Float, nullable=True)
    # Multimodal fields
    trash_type = Column(String(64), nullable=True, index=True)  # Final fused trash type
    fusion_confidence = Column(Float, nullable=True)  # Final fused confidence
    visual_class = Column(String(64), nullable=True)  # Visual prediction class
    visual_confidence = Column(Float, nullable=True)  # Visual prediction confidence
    audio_label = Column(String(64), nullable=True)  # Audio prediction label
    audio_confidence = Column(Float, nullable=True)  # Audio prediction confidence
    has_image = Column(Integer, default=0)  # 1 if image was provided, 0 otherwise
    has_audio = Column(Integer, default=0)  # 1 if audio was provided, 0 otherwise


class TrashLog(Base):
    """Stores each multimodal fusion result for the live dashboard."""

    __tablename__ = "trash_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    visual_label = Column(String(128), nullable=True)
    audio_label = Column(String(64), nullable=True)
    final_decision = Column(String(128), nullable=True)
    confidence_score = Column(Float, nullable=True)
    visual_weight_70 = Column(Float, nullable=True)
    audio_weight_30 = Column(Float, nullable=True)


def _engine():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, "data", "predictions.db")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    uri = "sqlite:///" + path.replace("\\", "/")
    return create_engine(uri, connect_args={"check_same_thread": False})


engine = _engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create tables if they do not exist."""
    Base.metadata.create_all(bind=engine)
    _ensure_prediction_log_columns()


def _ensure_prediction_log_columns() -> None:
    """Add missing columns for legacy databases (non-destructive)."""
    expected = {
        "trash_type": "VARCHAR(64)",
        "fusion_confidence": "FLOAT",
        "visual_class": "VARCHAR(64)",
        "visual_confidence": "FLOAT",
        "audio_label": "VARCHAR(64)",
        "audio_confidence": "FLOAT",
        "has_image": "INTEGER DEFAULT 0",
        "has_audio": "INTEGER DEFAULT 0",
    }

    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(prediction_logs)")).fetchall()
        existing = {r[1] for r in rows}
        for name, ddl in expected.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE prediction_logs ADD COLUMN {name} {ddl}"))


def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI: yield a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
