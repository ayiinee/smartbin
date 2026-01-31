from datetime import datetime, timedelta

from app import create_app
from app.db_models.models import AnomalyData, CarbonMetric, SmartBin, WasteLog
from app.extensions import db


def seed_dashboard():
    if SmartBin.query.count() or WasteLog.query.count():
        print("Seed skipped: existing data found.")
        return

    bins = [
        SmartBin(location_name="1st Floor Canteen", latitude=-6.201, longitude=106.816, is_active=True, fill_level=78),
        SmartBin(location_name="Lobby", latitude=-6.202, longitude=106.817, is_active=True, fill_level=52),
        SmartBin(location_name="Conference Wing", latitude=-6.203, longitude=106.818, is_active=True, fill_level=88),
        SmartBin(location_name="Floor 3 Pantry", latitude=-6.204, longitude=106.819, is_active=True, fill_level=91),
        SmartBin(location_name="Level 2 - Hallway", latitude=-6.205, longitude=106.820, is_active=True, fill_level=94),
        SmartBin(location_name="Parking Garage", latitude=-6.206, longitude=106.821, is_active=False, fill_level=0),
        SmartBin(location_name="Cafeteria", latitude=-6.207, longitude=106.822, is_active=True, fill_level=66),
        SmartBin(location_name="Rooftop Garden", latitude=-6.208, longitude=106.823, is_active=True, fill_level=35),
    ]

    db.session.add_all(bins)
    db.session.flush()

    now = datetime.utcnow()
    logs = [
        WasteLog(
            bin_id=bins[0].id,
            category="Plastic",
            confidence_score=0.98,
            timestamp=now - timedelta(minutes=10),
            visual_conf=0.97,
            audio_conf=0.96,
        ),
        WasteLog(
            bin_id=bins[1].id,
            category="Organic",
            confidence_score=0.93,
            timestamp=now - timedelta(minutes=13),
            visual_conf=0.92,
            audio_conf=0.9,
        ),
        WasteLog(
            bin_id=bins[2].id,
            category="Paper",
            confidence_score=0.91,
            timestamp=now - timedelta(minutes=17),
            visual_conf=0.9,
            audio_conf=0.88,
        ),
        WasteLog(
            bin_id=bins[3].id,
            category="Metal",
            confidence_score=0.96,
            timestamp=now - timedelta(minutes=21),
            visual_conf=0.95,
            audio_conf=0.94,
        ),
        WasteLog(
            bin_id=bins[4].id,
            category="Residue",
            confidence_score=0.86,
            timestamp=now - timedelta(hours=1, minutes=5),
            visual_conf=0.84,
            audio_conf=0.83,
        ),
        WasteLog(
            bin_id=bins[6].id,
            category="Organic",
            confidence_score=0.89,
            timestamp=now - timedelta(hours=2, minutes=10),
            visual_conf=0.88,
            audio_conf=0.86,
        ),
        WasteLog(
            bin_id=bins[7].id,
            category="Plastic",
            confidence_score=0.92,
            timestamp=now - timedelta(hours=2, minutes=25),
            visual_conf=0.91,
            audio_conf=0.9,
        ),
        WasteLog(
            bin_id=bins[0].id,
            category="Paper",
            confidence_score=0.9,
            timestamp=now - timedelta(hours=3, minutes=5),
            visual_conf=0.89,
            audio_conf=0.87,
        ),
        WasteLog(
            bin_id=bins[1].id,
            category="Metal",
            confidence_score=0.95,
            timestamp=now - timedelta(hours=4, minutes=12),
            visual_conf=0.94,
            audio_conf=0.92,
        ),
    ]

    db.session.add_all(logs)
    db.session.flush()

    carbon_metrics = [
        CarbonMetric(log_id=logs[0].id, co2_reduction_value=120, methane_reduction=35),
        CarbonMetric(log_id=logs[1].id, co2_reduction_value=90, methane_reduction=25),
        CarbonMetric(log_id=logs[2].id, co2_reduction_value=70, methane_reduction=18),
        CarbonMetric(log_id=logs[3].id, co2_reduction_value=85, methane_reduction=20),
    ]

    db.session.add_all(carbon_metrics)

    anomalies = [
        AnomalyData(
            waste_log_id=logs[4].id,
            image_path="storage/anomalies/mixed_001.jpg",
            user_label="Mixed Waste",
            status_verified=False,
        )
    ]

    db.session.add_all(anomalies)
    db.session.commit()
    print("Seed complete: dashboard data inserted.")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_dashboard()
