import argparse
import random
from datetime import datetime, timedelta

from app import create_app
from app.db_models.models import AnomalyData, CarbonMetric, SmartBin, WasteLog
from app.extensions import db

CATEGORIES = ["Organic", "Plastic", "Paper", "Metal", "Residue"]

# Approximate coordinates around Malang, East Java.
MALANG_BINS = [
    ("Alun-Alun Malang", -7.9826, 112.6307),
    ("Stasiun Kota Baru", -7.9776, 112.6376),
    ("Jalan Ijen", -7.9752, 112.6286),
    ("Tugu Malang", -7.9756, 112.6327),
    ("Kayutangan Heritage", -7.9829, 112.6320),
    ("Pasar Besar", -7.9846, 112.6338),
    ("Brawijaya University", -7.9525, 112.6141),
    ("Malang Town Square", -7.9571, 112.6167),
    ("Stadion Gajayana", -7.9773, 112.6195),
    ("Jodipan Colorful Village", -7.9834, 112.6352),
    ("Polinema", -7.9461, 112.6169),
    ("Museum Malang Tempo Doeloe", -7.9822, 112.6300),
    ("Terminal Arjosari", -7.9276, 112.6554),
    ("Terminal Gadang", -7.9993, 112.6318),
    ("Sawojajar", -7.9952, 112.6672),
    ("Klojen", -7.9692, 112.6308),
    ("Lowokwaru", -7.9584, 112.6148),
    ("Sukun", -7.9957, 112.6201),
    ("Kedungkandang", -8.0071, 112.6544),
    ("Dinoyo", -7.9457, 112.6160),
    ("Tlogomas", -7.9355, 112.5991),
    ("Bandulan", -7.9961, 112.5980),
    ("Mergosono", -7.9947, 112.6290),
    ("Madyopuro", -7.9549, 112.6938),
]


def _random_confidence(rng: random.Random, base: float = 0.85, spread: float = 0.15) -> float:
    return round(min(max(rng.uniform(base, base + spread), 0.5), 0.99), 2)


def seed_bulk(
    days: int,
    logs_per_day: int,
    bin_count: int,
    anomalies_ratio: float,
    with_carbon: bool,
    seed: int | None,
) -> None:
    rng = random.Random(seed)
    now = datetime.utcnow()
    start_date = now - timedelta(days=max(days, 1))

    bins = SmartBin.query.all()
    if not bins:
        locations = [
            "Lobby",
            "Cafeteria",
            "Conference Wing",
            "Parking Garage",
            "Main Hallway",
            "Rooftop Garden",
            "Level 2 Pantry",
            "Level 3 Pantry",
            "Auditorium",
            "East Wing",
            "West Wing",
            "Loading Dock",
        ]
        use_malang = bin_count <= len(MALANG_BINS)
        for idx in range(bin_count):
            if use_malang:
                name, lat, lon = MALANG_BINS[idx]
            else:
                base_lat = -6.200 + (idx * 0.001)
                base_lon = 106.810 + (idx * 0.001)
                name = locations[idx % len(locations)]
                lat, lon = base_lat, base_lon
            bins.append(
                SmartBin(
                    location_name=name,
                    latitude=lat,
                    longitude=lon,
                    is_active=True if idx % 7 != 0 else False,
                    fill_level=rng.randint(10, 95),
                )
            )
        db.session.add_all(bins)
        db.session.flush()

    logs_to_add: list[WasteLog] = []
    for day in range(days):
        day_start = start_date + timedelta(days=day)
        for _ in range(logs_per_day):
            ts = day_start + timedelta(
                hours=rng.randint(0, 23),
                minutes=rng.randint(0, 59),
                seconds=rng.randint(0, 59),
            )
            category = rng.choice(CATEGORIES)
            conf = _random_confidence(rng)
            visual_conf = _random_confidence(rng, 0.8, 0.18)
            audio_conf = _random_confidence(rng, 0.78, 0.2)
            bin_obj = rng.choice(bins)
            logs_to_add.append(
                WasteLog(
                    bin_id=bin_obj.id,
                    category=category,
                    confidence_score=conf,
                    timestamp=ts,
                    visual_conf=visual_conf,
                    audio_conf=audio_conf,
                )
            )

    db.session.add_all(logs_to_add)
    db.session.flush()

    if with_carbon:
        carbon_rows: list[CarbonMetric] = []
        for log in logs_to_add:
            base = {
                "Organic": 1.6,
                "Plastic": 2.2,
                "Paper": 1.4,
                "Metal": 1.1,
                "Residue": 0.9,
            }.get(log.category, 1.0)
            co2 = round(base * rng.uniform(40, 110), 2)
            methane = round(base * rng.uniform(8, 30), 2)
            carbon_rows.append(
                CarbonMetric(
                    log_id=log.id,
                    co2_reduction_value=co2,
                    methane_reduction=methane,
                )
            )
        db.session.add_all(carbon_rows)

    if anomalies_ratio > 0:
        anomaly_count = max(1, int(len(logs_to_add) * anomalies_ratio))
        sampled_logs = rng.sample(logs_to_add, min(anomaly_count, len(logs_to_add)))
        anomalies = [
            AnomalyData(
                waste_log_id=log.id,
                image_path=f"storage/anomalies/auto_{log.id}.jpg",
                user_label=rng.choice(["Mixed Waste", "Contamination", "Unknown"]),
                status_verified=rng.choice([False, False, True]),
            )
            for log in sampled_logs
        ]
        db.session.add_all(anomalies)

    db.session.commit()
    print(
        "Seed complete:",
        f"bins={len(bins)}",
        f"logs={len(logs_to_add)}",
        f"days={days}",
        f"logs_per_day={logs_per_day}",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk seed SmartBin analytics data.")
    parser.add_argument("--days", type=int, default=180, help="Number of days to seed (default: 180).")
    parser.add_argument("--logs-per-day", type=int, default=20, help="Logs per day (default: 20).")
    parser.add_argument("--bin-count", type=int, default=12, help="Number of bins to create if empty (default: 12).")
    parser.add_argument("--anomalies-ratio", type=float, default=0.03, help="Ratio of anomalies (default: 0.03).")
    parser.add_argument("--no-carbon", action="store_true", help="Skip carbon metrics generation.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42).")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        seed_bulk(
            days=max(args.days, 1),
            logs_per_day=max(args.logs_per_day, 1),
            bin_count=max(args.bin_count, 1),
            anomalies_ratio=max(args.anomalies_ratio, 0),
            with_carbon=not args.no_carbon,
            seed=args.seed,
        )


if __name__ == "__main__":
    main()
