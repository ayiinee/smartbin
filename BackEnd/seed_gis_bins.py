import sys
from datetime import datetime

from app import create_app
from app.db_models.models import AnomalyData, CarbonMetric, SmartBin, WasteLog
from app.extensions import db

STATUS_TO_FILL_LEVEL = {
    "active": 45,
    "maintenance": 75,
    "full": 95,
    "offline": 0,
}

GIS_BINS = [
    {
        "id": "SB-UM-01",
        "name": "Smartbin UM-01",
        "institutionId": "inst-um",
        "institutionName": "Universitas Negeri Malang",
        "clusterId": "cluster-edu",
        "clusterName": "University District",
        "unitId": "unit-um-main",
        "unitName": "Main Campus",
        "status": "active",
        "lat": -7.961474,
        "lng": 112.617872,
        "updatedAt": "2026-01-31 10:42",
    },
    {
        "id": "SB-UB-01",
        "name": "Smartbin UB-01",
        "institutionId": "inst-ub",
        "institutionName": "Universitas Brawijaya",
        "clusterId": "cluster-edu",
        "clusterName": "University District",
        "unitId": "unit-ub-main",
        "unitName": "Main Campus",
        "status": "maintenance",
        "lat": -7.95235,
        "lng": 112.61296,
        "updatedAt": "2026-01-31 09:55",
    },
    {
        "id": "SB-MATOS-01",
        "name": "Smartbin MATOS-01",
        "institutionId": "inst-matos",
        "institutionName": "Malang Town Square",
        "clusterId": "cluster-retail",
        "clusterName": "Retail Hub",
        "unitId": "unit-matos-atrium",
        "unitName": "Main Atrium",
        "status": "full",
        "lat": -7.95682,
        "lng": 112.6188,
        "updatedAt": "2026-01-31 10:28",
    },
    {
        "id": "SB-MOG-01",
        "name": "Smartbin MOG-01",
        "institutionId": "inst-mog",
        "institutionName": "Mall Olympic Garden",
        "clusterId": "cluster-retail",
        "clusterName": "Retail Hub",
        "unitId": "unit-mog-entrance",
        "unitName": "Main Entrance",
        "status": "offline",
        "lat": -7.97696,
        "lng": 112.62388,
        "updatedAt": "2026-01-31 08:12",
    },
    {
        "id": "SB-LIB-01",
        "name": "Smartbin LIB-01",
        "institutionId": "inst-lib",
        "institutionName": "Perpustakaan Kota Malang",
        "clusterId": "cluster-civic",
        "clusterName": "Civic Center",
        "unitId": "unit-lib-main",
        "unitName": "Public Library",
        "status": "active",
        "lat": -7.9722203,
        "lng": 112.6220435,
        "updatedAt": "2026-01-31 10:10",
    },
]


def _parse_updated_at(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M")


def seed_gis_bins(force: bool = False) -> None:
    if force:
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

    if SmartBin.query.count():
        print("Seed skipped: smartbin data already exists.")
        return

    bins = []
    logs = []

    for entry in GIS_BINS:
        fill_level = STATUS_TO_FILL_LEVEL.get(entry["status"], 0)
        is_active = entry["status"] != "offline"
        bin_item = SmartBin(
            location_name=entry["name"],
            latitude=entry["lat"],
            longitude=entry["lng"],
            is_active=is_active,
            fill_level=fill_level,
        )
        bins.append(bin_item)

    db.session.add_all(bins)
    db.session.flush()

    for entry, bin_item in zip(GIS_BINS, bins):
        logs.append(
            WasteLog(
                bin_id=bin_item.id,
                category="Mixed",
                confidence_score=0.9,
                timestamp=_parse_updated_at(entry["updatedAt"]),
                visual_conf=0.9,
                audio_conf=0.9,
            )
        )

    db.session.add_all(logs)
    db.session.commit()
    print(f"Seed complete: {len(bins)} smartbins inserted.")


if __name__ == "__main__":
    force = "--force" in sys.argv
    app = create_app()
    with app.app_context():
        seed_gis_bins(force=force)
