"""
Neighborhood Waste Schedule Resolution Tool.
Resolves micro-local pickup days from DynamoDB / local JSON cache and computes upcoming collection dates.
"""
import os
import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from src.shared.logger import get_logger

logger = get_logger("schedule_tool")

WEEKDAYS_JP_TO_INT = {
    "月曜日": 0, "月曜": 0, "月": 0,
    "火曜日": 1, "火曜": 1, "火": 1,
    "水曜日": 2, "水曜": 2, "水": 2,
    "木曜日": 3, "木曜": 3, "木": 3,
    "金曜日": 4, "金曜": 4, "金": 4,
    "土曜日": 5, "土曜": 5, "土": 5,
    "日曜日": 6, "日曜": 6, "日": 6,
}

WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def get_nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> Optional[datetime]:
    first_day = datetime(year, month, 1)
    day_diff = (weekday - first_day.weekday()) % 7
    first_target = first_day + timedelta(days=day_diff)
    target_date = first_target + timedelta(weeks=(n - 1))
    if target_date.month == month:
        return target_date
    return None

def compute_next_collection_date(day_patterns: List[str], current_dt: Optional[datetime] = None) -> Dict[str, Any]:
    if not current_dt:
        current_dt = datetime.now()

    cutoff_hour = 8

    if not day_patterns or any("Daily" in p or "*" in p for p in day_patterns):
        return {
            "description": "Daily / Special Commercial Collection",
            "next_date": (current_dt + timedelta(days=1)).strftime("%Y-%m-%d"),
            "next_day_en": "Tomorrow (Daily Collection)",
            "cutoff_time": "08:00 AM"
        }

    candidates = []

    for pattern in day_patterns:
        nth_match = re.search(r"([1-4])(?:・([1-4]))?番目の([月火水木金土日]曜日?)", pattern)
        if nth_match:
            weeks = [int(nth_match.group(1))]
            if nth_match.group(2):
                weeks.append(int(nth_match.group(2)))
            wk_jp = nth_match.group(3)
            wk_int = WEEKDAYS_JP_TO_INT.get(wk_jp, 2)

            for month_offset in [0, 1]:
                m = current_dt.month + month_offset
                y = current_dt.year
                if m > 12:
                    m -= 12
                    y += 1
                for w in weeks:
                    nth_date = get_nth_weekday_of_month(y, m, wk_int, w)
                    if nth_date:
                        target = nth_date.replace(hour=cutoff_hour, minute=0, second=0)
                        if target > current_dt:
                            candidates.append(target)
        else:
            for jp_name, wk_int in WEEKDAYS_JP_TO_INT.items():
                if jp_name in pattern:
                    days_ahead = (wk_int - current_dt.weekday()) % 7
                    target = current_dt.replace(hour=cutoff_hour, minute=0, second=0) + timedelta(days=days_ahead)
                    if target <= current_dt:
                        target += timedelta(days=7)
                    candidates.append(target)
                    break

    if not candidates:
        return {
            "pattern": ", ".join(day_patterns),
            "next_date": "Consult Ward Guide",
            "next_day_en": "Twice Monthly",
            "cutoff_time": "08:00 AM"
        }

    candidates.sort()
    next_date = candidates[0]
    days_until = (next_date.date() - current_dt.date()).days

    relative_label = "Today before 8:00 AM" if days_until == 0 else ("Tomorrow" if days_until == 1 else f"In {days_until} days")

    return {
        "pattern": ", ".join(day_patterns),
        "next_date": next_date.strftime("%Y-%m-%d"),
        "day_of_week": WEEKDAYS_EN[next_date.weekday()],
        "relative_label": relative_label,
        "cutoff_time": "08:00 AM"
    }

def lookup_neighborhood_schedule(neighborhood: str, banchi: Optional[str] = None, municipality: str = "tokyo_shinjuku") -> Dict[str, Any]:
    # Locate data cache
    script_dir = os.path.dirname(os.path.abspath(__file__))
    possible_paths = [
        os.path.abspath(os.path.join(script_dir, "../../../backend-agent/data/shinjuku_normalized.json")),
        os.path.abspath(os.path.join(script_dir, "../../../frontend/src/lib/shinjuku_data.json")),
        os.path.abspath(os.path.join(script_dir, "../../../data/neighborhoods.json"))
    ]

    records = []
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    records = json.load(f)
                    break
            except Exception:
                continue

    if not records:
        return {"error": "Schedule data records unavailable"}

    clean_query = neighborhood.strip()
    matching_rows = [r for r in records if clean_query in r.get("town_full", "") or r.get("town_clean", "") in clean_query]

    if not matching_rows:
        matching_rows = [r for r in records if clean_query in r.get("kana", "")]

    chosen_row = None

    if len(matching_rows) == 1:
        chosen_row = matching_rows[0]
    elif len(matching_rows) > 1:
        if banchi:
            banchi_num = re.sub(r"[^\d]", "", banchi)
            if banchi_num:
                num = int(banchi_num)
                for r in matching_rows:
                    spec = r.get("banchi_spec", "all")
                    if spec != "all" and "除く" not in spec:
                        range_match = re.search(r"(\d+)から(\d+)", spec)
                        if range_match:
                            low, high = int(range_match.group(1)), int(range_match.group(2))
                            if low <= num <= high:
                                chosen_row = r
                                break

        if not chosen_row:
            default_row = next((r for r in matching_rows if "上記を除く" in r.get("town_full", "")), None)
            if default_row:
                chosen_row = default_row
            else:
                chosen_row = matching_rows[0]

    if not chosen_row:
        chosen_row = records[0]

    now = datetime.now()
    return {
        "municipality": chosen_row.get("municipality", "shinjuku"),
        "municipality_display": chosen_row.get("municipality_display", "Shinjuku City (新宿区)"),
        "town": chosen_row.get("town_full", neighborhood),
        "sanitation_office": chosen_row.get("sanitation_office", "East Shinjuku"),
        "is_special_commercial_zone": chosen_row.get("is_special_zone", False),
        "schedules": {
            "burnable": {
                "days": chosen_row.get("burnable_raw", "火曜日・金曜日"),
                "next": compute_next_collection_date(chosen_row.get("burnable_days", ["火曜日", "金曜日"]), now)
            },
            "recyclable": {
                "days": chosen_row.get("recyclable_raw", "木曜日"),
                "next": compute_next_collection_date(chosen_row.get("recyclable_days", ["木曜日"]), now)
            },
            "unburnable": {
                "days": chosen_row.get("unburnable_raw", "2・4番目の土曜日"),
                "next": compute_next_collection_date(chosen_row.get("unburnable_days", ["2・4番目の土曜日"]), now)
            }
        }
    }
