import sys
from datetime import datetime

from app import create_app
from app.db_models.models import AnomalyData, CarbonMetric, SmartBin, WasteLog
from app.extensions import db

MALANG_BINS = [
    ("Alun-Alun Malang", -7.9826, 112.6307, True, 62),
    ("Stasiun Kota Baru", -7.9776, 112.6376, True, 48),
    ("Jalan Ijen", -7.9752, 112.6286, True, 75),
    ("Tugu Malang", -7.9756, 112.6327, True, 33),
    ("Kayutangan Heritage", -7.9829, 112.6320, True, 84),
    ("Pasar Besar Malang", -7.9846, 112.6338, True, 58),
    ("Universitas Brawijaya", -7.9525, 112.6141, True, 41),
    ("Malang Town Square", -7.9571, 112.6167, True, 90),
    ("Stadion Gajayana", -7.9773, 112.6195, True, 69),
    ("Jodipan Colorful Village", -7.9834, 112.6352, True, 52),
    ("Polinema", -7.9461, 112.6169, False, 0),
    ("Museum Malang Tempo Doeloe", -7.9822, 112.6300, True, 37),
    # tambah dataset kamu di sini...
]

def seed_bins(force: bool = False) -> None:
    # IMPORTANT: force hapus dulu sebelum count()
    if force:
        # Hapus dependensi dulu untuk menghindari FK violation
        anomaly_deleted = AnomalyData.query.delete()
        carbon_deleted = CarbonMetric.query.delete()
        waste_deleted = WasteLog.query.delete()
        deleted = SmartBin.query.delete()
        db.session.commit()
        print(
            "Force enabled: deleted "
            f"{deleted} smartbins, {waste_deleted} waste_logs, "
            f"{carbon_deleted} carbon_metrics, {anomaly_deleted} anomaly_data."
        )

    # baru cek count setelah force
    if SmartBin.query.count():
        print("Seed skipped: smartbin data already exists.")
        return

    bins = [
        SmartBin(
            location_name=name,
            latitude=lat,
            longitude=lon,
            is_active=is_active,
            fill_level=fill_level,
        )
        for name, lat, lon, is_active, fill_level in MALANG_BINS
    ]

    db.session.add_all(bins)
    db.session.commit()
    print(f"Seed complete: {len(bins)} smartbins inserted at {datetime.utcnow().isoformat()}.")

if __name__ == "__main__":
    force = "--force" in sys.argv
    app = create_app()
    with app.app_context():
        seed_bins(force=force)
