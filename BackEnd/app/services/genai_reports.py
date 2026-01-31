from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
import os
from typing import Any, Dict, List, Tuple

import google.generativeai as genai

from app.db_models.models import CarbonMetric, SmartBin, WasteLog
from app.extensions import db

CATEGORY_COLORS = {
    "Organic": "#228B22",
    "Plastic": "#87CEEB",
    "Paper": "#94A3B8",
    "Metal": "#1F2937",
    "Residue": "#8B3A3A",
}

CATEGORY_WEIGHTS_KG = {
    "Organic": 3.5,
    "Plastic": 2.1,
    "Paper": 1.8,
    "Metal": 1.4,
    "Residue": 1.1,
}


def _get_date_range(days: int) -> Tuple[datetime, datetime]:
    safe_days = max(days, 1)
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=safe_days - 1)
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
    return start_dt, end_dt


def _format_day_label(day: datetime.date) -> str:
    return day.strftime("%b %d")


def _format_week_label(week_start: datetime.date) -> str:
    return f"Week of {week_start.strftime('%b %d')}"


def _normalize_confidence(value: float | None) -> float:
    if value is None:
        return 0.0
    return value * 100 if value <= 1 else value


def get_carbon_trend(days: int = 7, weeks: int = 4) -> Dict[str, Any]:
    start_dt, end_dt = _get_date_range(days)
    records = (
        db.session.query(WasteLog.timestamp, CarbonMetric.co2_reduction_value)
        .join(CarbonMetric, CarbonMetric.log_id == WasteLog.id)
        .filter(WasteLog.timestamp >= start_dt, WasteLog.timestamp < end_dt)
        .all()
    )

    daily_map: Dict[datetime.date, float] = defaultdict(float)
    for ts, value in records:
        if ts is None:
            continue
        daily_map[ts.date()] += float(value or 0)

    daily_labels = []
    daily_values = []
    current_date = start_dt.date()
    end_date = (end_dt - timedelta(days=1)).date()
    while current_date <= end_date:
        daily_labels.append(current_date)
        daily_values.append(round(daily_map.get(current_date, 0.0), 2))
        current_date += timedelta(days=1)

    weekly_map: Dict[datetime.date, float] = defaultdict(float)
    for ts, value in records:
        if ts is None:
            continue
        day = ts.date()
        week_start = day - timedelta(days=day.weekday())
        weekly_map[week_start] += float(value or 0)

    week_starts = []
    end_week_start = end_date - timedelta(days=end_date.weekday())
    for offset in reversed(range(max(weeks, 1))):
        week_starts.append(end_week_start - timedelta(weeks=offset))

    weekly_values = [round(weekly_map.get(start, 0.0), 2) for start in week_starts]

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "unit": "kg CO2e",
        "total_avoided": round(sum(daily_values), 2),
        "daily": [
            {"label": _format_day_label(day), "value": value, "date": day.isoformat()}
            for day, value in zip(daily_labels, daily_values)
        ],
        "weekly": [
            {
                "label": _format_week_label(start),
                "value": value,
                "date": start.isoformat(),
            }
            for start, value in zip(week_starts, weekly_values)
        ],
        "range_start": start_dt.date().isoformat(),
        "range_end": end_date.isoformat(),
    }


def get_waste_composition(days: int = 7) -> Dict[str, Any]:
    start_dt, end_dt = _get_date_range(days)
    logs = (
        WasteLog.query.filter(WasteLog.timestamp >= start_dt, WasteLog.timestamp < end_dt)
        .order_by(WasteLog.timestamp.desc())
        .all()
    )

    category_totals: Dict[str, float] = defaultdict(float)
    total_weight = 0.0
    for log in logs:
        weight = CATEGORY_WEIGHTS_KG.get(log.category, 1.0)
        category_totals[log.category] += weight
        total_weight += weight

    breakdown = []
    for category, weight in sorted(category_totals.items(), key=lambda item: item[1], reverse=True):
        percent = (weight / total_weight * 100) if total_weight else 0
        breakdown.append(
            {
                "label": category,
                "value": round(weight, 2),
                "percent": round(percent, 1),
                "color": CATEGORY_COLORS.get(category, "#94A3B8"),
            }
        )

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "range_start": start_dt.date().isoformat(),
        "range_end": (end_dt - timedelta(days=1)).date().isoformat(),
        "total_weight": round(total_weight, 2),
        "categories": breakdown,
    }


def get_reporting_summary(days: int = 7) -> Dict[str, Any]:
    start_dt, end_dt = _get_date_range(days)
    logs = WasteLog.query.filter(WasteLog.timestamp >= start_dt, WasteLog.timestamp < end_dt).all()
    total_logs = len(logs)
    total_bins = SmartBin.query.count()
    active_bins = SmartBin.query.filter_by(is_active=True).count()

    carbon_totals = (
        db.session.query(
            db.func.sum(CarbonMetric.co2_reduction_value),
            db.func.sum(CarbonMetric.methane_reduction),
        )
        .join(WasteLog, WasteLog.id == CarbonMetric.log_id)
        .filter(WasteLog.timestamp >= start_dt, WasteLog.timestamp < end_dt)
        .first()
    )
    carbon_avoided = float(carbon_totals[0] or 0)
    methane_avoided = float(carbon_totals[1] or 0)

    composition = get_waste_composition(days)
    trend = get_carbon_trend(days=days, weeks=4)

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "range_start": start_dt.date().isoformat(),
        "range_end": (end_dt - timedelta(days=1)).date().isoformat(),
        "total_logs": total_logs,
        "total_bins": total_bins,
        "active_bins": active_bins,
        "carbon_avoided": round(carbon_avoided, 2),
        "methane_avoided": round(methane_avoided, 2),
        "composition": composition,
        "trend": trend,
    }


def generate_gemini_insight(
    question: str,
    summary: Dict[str, Any],
    history: List[Dict[str, str]] | None = None,
) -> str:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY / GOOGLE_API_KEY belum dikonfigurasi.")

    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "models/gemini-flash-latest")
    model = genai.GenerativeModel(model_name)

    composition_lines = []
    for item in summary.get("composition", {}).get("categories", []):
        composition_lines.append(
            f"- {item['label']}: {item['value']} kg ({item['percent']}%)"
        )

    daily_lines = []
    for item in summary.get("trend", {}).get("daily", []):
        daily_lines.append(f"- {item['date']}: {item['value']} kg CO2e")

    weekly_lines = []
    for item in summary.get("trend", {}).get("weekly", []):
        weekly_lines.append(f"- {item['date']}: {item['value']} kg CO2e")

    history_lines = []
    for item in (history or [])[-6:]:
        role = item.get("role", "user")
        content = item.get("content", "")
        history_lines.append(f"{role.title()}: {content}")

    prompt = f"""
Anda adalah SmartBin Gemini AI Analyst. Jawab dalam Bahasa Indonesia yang ringkas dan jelas.
Gunakan hanya data snapshot di bawah. Jika pertanyaan di luar data, jelaskan keterbatasannya.

DATA SNAPSHOT:
Periode: {summary.get('range_start')} sampai {summary.get('range_end')} (UTC)
Total log: {summary.get('total_logs')}
Smartbin aktif: {summary.get('active_bins')} dari {summary.get('total_bins')}
Carbon avoided: {summary.get('carbon_avoided')} kg CO2e
Methane avoided: {summary.get('methane_avoided')} kg

Komposisi sampah:
{chr(10).join(composition_lines) if composition_lines else "- Belum ada data."}

Tren harian (7 hari terakhir):
{chr(10).join(daily_lines) if daily_lines else "- Belum ada data."}

Tren mingguan (4 minggu terakhir):
{chr(10).join(weekly_lines) if weekly_lines else "- Belum ada data."}

Riwayat percakapan singkat:
{chr(10).join(history_lines) if history_lines else "- Tidak ada."}

Pertanyaan pengguna:
{question}
"""

    response = model.generate_content(prompt)
    text = getattr(response, "text", None) or ""
    cleaned = text.strip()
    if cleaned:
        return cleaned
    return "Maaf, saya belum bisa menghasilkan analisis saat ini."

import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
else:
    # Handle missing key gracefully in production, though verification script might complain
    print("Warning: GEMINI_API_KEY not found in environment variables.")

def generate_esg_report(stats_summary: dict) -> str:
    """
    Generates a persuasive Environmental Impact Statement using Google Gemini.
    
    Args:
        stats_summary (dict): Dictionary containing consolidated waste statistics.
                              Example:
                              {
                                'period': 'January 2026',
                                'total_weight_kg': 150.5,
                                'breakdown': {'Plastic': 50, 'Organic': 100},
                                'co2_reduced_total': 345.2,
                                'methane_reduced_total': 4.0
                              }
                              
    Returns:
        str: Generated narrative report or error message.
    """
    if not GENAI_API_KEY:
        return "Service Error: Gemini API Key is missing. Cannot generate report."

    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # Using flash for speed/cost effectiveness

        # Construct the prompt
        prompt = f"""
        You are an Environmental Consultant writing a highly persuasive and professional ESG (Environmental, Social, and Governance) impact statement for a Smart Waste Management initiative.
        
        Using the following monthly waste data:
        {stats_summary}
        
        Please draft a concise but impactful "Environmental Impact Statement" (approx 150-200 words).
        
        The report should:
        1. Highlight the key achievements (total waste diverted, CO2 reduced).
        2. Specifically mention the avoidance of methane from organic waste if applicable.
        3. Use professional, inspiring language suitable for a corporate sustainability report or stakeholder presentation.
        4. Focus on the positive environmental outcome ("The Planet Saved", "Clean Air Contribution").
        5. Provide a specific "Equivalent To" comparison (e.g., "This reduction is equivalent to taking X cars off the road" or "planting Y trees").
        
        Format the output with clear bold statements where appropriate.
        """

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        return f"Error generating report: {str(e)}"
