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

_PATTERNS_MAP = None

def get_patterns_map() -> Dict[str, Any]:
    global _PATTERNS_MAP
    if _PATTERNS_MAP is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        pat_path = os.path.abspath(os.path.join(script_dir, "../../../data/patterns.json"))
        if os.path.exists(pat_path):
            try:
                with open(pat_path, "r", encoding="utf-8") as f:
                    patterns = json.load(f)
                    _PATTERNS_MAP = {p["pattern_id"]: p for p in patterns}
            except Exception:
                _PATTERNS_MAP = {}
        else:
            _PATTERNS_MAP = {}
    return _PATTERNS_MAP

def lookup_neighborhood_schedule(neighborhood: str, banchi: Optional[str] = None, municipality: str = "tokyo_shinjuku") -> Dict[str, Any]:
    # Locate data cache (Prioritizing data/neighborhoods.json which contains all 4 municipalities)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    possible_paths = [
        os.path.abspath(os.path.join(script_dir, "../../../data/neighborhoods.json")),
        os.path.abspath(os.path.join(script_dir, "../../../backend-agent/data/shinjuku_normalized.json")),
        os.path.abspath(os.path.join(script_dir, "../../../frontend/src/lib/shinjuku_data.json"))
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

    clean_query = neighborhood.strip().lower()
    matching_rows = []

    # Canonicalize municipality filter if provided
    canon_muni = None
    if municipality:
        canon_muni = municipality.lower()
        if "shinjuku" in canon_muni:
            canon_muni = "tokyo_shinjuku"
        elif "yokohama" in canon_muni:
            canon_muni = "kanagawa_yokohama"
        elif "kyoto" in canon_muni:
            canon_muni = "kyoto_kyoto"
        elif "kamikatsu" in canon_muni:
            canon_muni = "tokushima_kamikatsu"

    for r in records:
        r_muni = r.get("municipality_id") or r.get("municipality", "")
        if canon_muni and r_muni and r_muni != canon_muni:
            continue

        tj = (r.get("town_full") or r.get("name_ja") or "").lower()
        tc = (r.get("town_clean") or "").lower()
        te = (r.get("name_en") or "").lower()
        nid = (r.get("neighborhood_id") or "").lower()
        kana = (r.get("kana") or "").lower()

        if clean_query in tj or (tc and tc in clean_query) or clean_query in te or clean_query in nid or clean_query in kana:
            matching_rows.append(r)

    chosen_row = None

    if len(matching_rows) == 1:
        chosen_row = matching_rows[0]
    elif len(matching_rows) > 1:
        if banchi:
            banchi_num = re.sub(r"[^\d]", "", banchi)
            if banchi_num:
                num = int(banchi_num)
                for r in matching_rows:
                    spec = r.get("banchi_spec") or r.get("address_range") or "all"
                    if spec != "all" and "除く" not in spec:
                        range_match = re.search(r"(\d+)から(\d+)", spec)
                        if range_match:
                            low, high = int(range_match.group(1)), int(range_match.group(2))
                            if low <= num <= high:
                                chosen_row = r
                                break

        if not chosen_row:
            default_row = next((r for r in matching_rows if "上記を除く" in (r.get("town_full") or r.get("name_ja") or r.get("address_range") or "") or "Except" in r.get("name_en", "")), None)
            if default_row:
                chosen_row = default_row
            else:
                chosen_row = matching_rows[0]

    if not chosen_row:
        chosen_row = records[0]

    now = datetime.now()
    schedules_out: Dict[str, Any] = {}

    # Check if pattern_id exists to resolve all dynamic keys
    pat_id = chosen_row.get("pattern_id")
    pat_data = get_patterns_map().get(pat_id) if pat_id else None

    if pat_data and "schedules" in pat_data:
        for sk, days_val in pat_data["schedules"].items():
            days_list = days_val if isinstance(days_val, list) else [str(days_val)]
            schedules_out[sk] = {
                "days": ", ".join(days_list) if isinstance(days_val, list) else str(days_val),
                "next": compute_next_collection_date(days_list, now)
            }

        # Provide backward-compatibility aliases for existing frontend/agent contracts
        if "combustible" in schedules_out:
            schedules_out["burnable"] = schedules_out["combustible"]
        if "resources" in schedules_out:
            schedules_out["recyclable"] = schedules_out["resources"]
        elif "cans_bottles_pet" in schedules_out:
            schedules_out["recyclable"] = schedules_out["cans_bottles_pet"]
        if "metal_ceramics_glass" in schedules_out:
            schedules_out["unburnable"] = schedules_out["metal_ceramics_glass"]
        elif "small_metal" in schedules_out:
            schedules_out["unburnable"] = schedules_out["small_metal"]
    else:
        # Fallback to legacy structure
        schedules_out = {
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

    muni_name = chosen_row.get("municipality_id") or chosen_row.get("municipality", municipality)
    town_name = chosen_row.get("name_ja") or chosen_row.get("town_full", neighborhood)

    return {
        "municipality": muni_name,
        "municipality_display": chosen_row.get("municipality_display", f"{muni_name.replace('_', ' ').title()}"),
        "town": town_name,
        "sanitation_office": chosen_row.get("sanitation_office", "Municipal Clean Center"),
        "is_special_commercial_zone": chosen_row.get("is_special_zone", False),
        "schedules": schedules_out
    }

def resolve_item_schedule(schedule_key: str, neighborhood_schedules: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolves pickup info for a specific canonical schedule key from the neighborhood's schedule map.
    """
    if not neighborhood_schedules:
        return {
            "pickup_day": "Unknown",
            "next_pickup_date": "Consult Ward Guide"
        }

    # Direct key match
    target = neighborhood_schedules.get(schedule_key)
    if not target:
        # Fallback alias resolution
        alias_map = {
            "resources": ["recyclable", "cans_bottles_pet", "plastic_packaging"],
            "combustible": ["burnable"],
            "metal_ceramics_glass": ["unburnable", "small_metal", "non_combustible"],
            "plastic_packaging": ["resources", "recyclable"],
            "cans_bottles_pet": ["resources", "recyclable"],
            "small_metal": ["unburnable", "metal_ceramics_glass"],
            "non_combustible": ["unburnable", "metal_ceramics_glass"],
            "clothing": ["resources", "recyclable"],
            "small_metal_sprays": ["small_metal", "unburnable"],
            "miscellaneous_paper": ["resources", "recyclable"]
        }
        for alt in alias_map.get(schedule_key, []):
            if alt in neighborhood_schedules:
                target = neighborhood_schedules[alt]
                break

    if schedule_key == "station_dropoff" or "station_dropoff" in neighborhood_schedules:
        station = neighborhood_schedules.get("station_dropoff", {})
        return {
            "pickup_day": "Daily (07:30 AM - 02:00 PM)",
            "next_pickup_date": "Daily",
            "cutoff_time": "02:00 PM",
            "relative_label": "Today before 02:00 PM (Why? Station Drop-Off)"
        }

    if schedule_key == "home_compost":
        return {
            "pickup_day": "Home Composting",
            "next_pickup_date": "On-Site Composting",
            "cutoff_time": "N/A",
            "relative_label": "Compost at home (Banned at station)"
        }

    if target:
        nxt = target.get("next", {})
        return {
            "pickup_day": target.get("days", "Weekly"),
            "next_pickup_date": nxt.get("next_date", "Weekly"),
            "cutoff_time": nxt.get("cutoff_time", "08:00 AM"),
            "relative_label": nxt.get("relative_label", "")
        }

    return {
        "pickup_day": "Twice Monthly / Consult Guide",
        "next_pickup_date": "Consult Ward Guide",
        "cutoff_time": "08:00 AM"
    }

