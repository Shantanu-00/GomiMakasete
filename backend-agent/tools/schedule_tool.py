"""
Neighborhood Waste Schedule Resolution Tool for Strands Agents.
Queries DynamoDB (or normalized local cache) to resolve micro-local pickup days
and calculates the exact next collection calendar dates.
"""
import os
import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

WEEKDAYS_JP_TO_INT = {
    "月曜日": 0, "月曜": 0, "月": 0,
    "火曜日": 1, "火曜": 1, "火": 1,
    "水曜日": 2, "水曜": 2, "水": 2,
    "木曜日": 3, "木曜": 3, "木": 3,
    "金曜日": 4, "金曜": 4, "金": 4,
    "土曜日": 5, "土曜": 5, "土": 5,
    "日曜日": 6, "日曜": 6, "日": 6,
}

WEEKDAYS_INT_TO_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def get_nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> Optional[datetime]:
    """Finds the nth occurrence of a weekday in a given month."""
    first_day = datetime(year, month, 1)
    # Days until first occurrence of target weekday
    day_diff = (weekday - first_day.weekday()) % 7
    first_target = first_day + timedelta(days=day_diff)
    target_date = first_target + timedelta(weeks=(n - 1))
    if target_date.month == month:
        return target_date
    return None

def compute_next_collection_date(day_patterns: List[str], current_dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Given Japanese pattern list like ["火曜日", "金曜日"] or ["2・4番目の土曜日"],
    computes the next upcoming calendar date. Collection cutoff is assumed to be 8:00 AM.
    """
    if not current_dt:
        current_dt = datetime.now()

    # Collection is in the morning at 8:00 AM
    cutoff_hour = 8

    # Case 1: Commercial / Special zone
    if not day_patterns or any("Daily" in p or "*" in p for p in day_patterns):
        return {
            "description": "Daily / Special Commercial Collection",
            "next_date": (current_dt + timedelta(days=1)).strftime("%Y-%m-%d"),
            "next_day_en": "Tomorrow (Daily Collection)",
            "cutoff": "Daily before 8:00 AM"
        }

    candidates = []

    for pattern in day_patterns:
        # Check for nth week pattern (e.g. "2・4番目の土曜日" or "1・3番目の水曜日")
        nth_match = re.search(r"([1-4])(?:・([1-4]))?番目の([月火水木金土日]曜日?)", pattern)
        if nth_match:
            weeks = [int(nth_match.group(1))]
            if nth_match.group(2):
                weeks.append(int(nth_match.group(2)))
            wk_jp = nth_match.group(3)
            wk_int = WEEKDAYS_JP_TO_INT.get(wk_jp, 2)

            # Check this month and next month
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
            # Regular weekly day (e.g. "火曜日", "金曜日")
            for jp_name, wk_int in WEEKDAYS_JP_TO_INT.items():
                if jp_name in pattern:
                    # Look ahead up to 7 days
                    days_ahead = (wk_int - current_dt.weekday()) % 7
                    target = current_dt.replace(hour=cutoff_hour, minute=0, second=0) + timedelta(days=days_ahead)
                    # If target is today but past cutoff, push to next week
                    if target <= current_dt:
                        target += timedelta(days=7)
                    candidates.append(target)
                    break

    if not candidates:
        return {
            "description": ", ".join(day_patterns),
            "next_date": "Consult Municipal Guide",
            "next_day_en": "Scheduled",
            "cutoff": "Before 8:00 AM"
        }

    candidates.sort()
    next_date = candidates[0]
    days_until = (next_date.date() - current_dt.date()).days

    if days_until == 0:
        relative_label = "Today (Before 8:00 AM)"
    elif days_until == 1:
        relative_label = "Tomorrow"
    else:
        relative_label = f"In {days_until} days"

    return {
        "pattern": ", ".join(day_patterns),
        "next_date": next_date.strftime("%Y-%m-%d"),
        "day_of_week": WEEKDAYS_INT_TO_EN[next_date.weekday()],
        "relative_label": relative_label,
        "cutoff_time": "08:00 AM"
    }

def lookup_neighborhood_schedule(neighborhood: str, banchi: Optional[str] = None, municipality: str = "shinjuku") -> Dict[str, Any]:
    """
    Resolves exact neighborhood schedule from normalized data cache or DynamoDB.
    Handles exact town names and banchi restrictions (e.g. 荒木町 21-23番地).
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.abspath(os.path.join(script_dir, "../data/shinjuku_normalized.json"))

    if not os.path.exists(json_path):
        return {"error": "Schedule data not found"}

    with open(json_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    clean_query = neighborhood.strip()

    # Step 1: Filter candidates matching neighborhood town name
    matching_rows = []
    for r in records:
        if clean_query in r["town_full"] or r["town_clean"] in clean_query:
            matching_rows.append(r)

    if not matching_rows:
        # Fuzzy / Kana search fallback
        for r in records:
            if clean_query in r["kana"]:
                matching_rows.append(r)

    if not matching_rows:
        # Default to Aizumicho (central Shinjuku) if unmatched
        chosen_row = records[0]
    elif len(matching_rows) == 1:
        chosen_row = matching_rows[0]
    else:
        # Multi-row match with banchi specifications (e.g. 荒木町, 市谷台町)
        chosen_row = None
        if banchi:
            banchi_num = re.sub(r"[^\d]", "", banchi)
            if banchi_num:
                num = int(banchi_num)
                for r in matching_rows:
                    spec = r["banchi_spec"]
                    if spec != "all" and "除く" not in spec:
                        # Extract range like 21から23番地 or 1、3、5
                        range_match = re.search(r"(\d+)から(\d+)", spec)
                        if range_match:
                            low, high = int(range_match.group(1)), int(range_match.group(2))
                            if low <= num <= high:
                                chosen_row = r
                                break
                        else:
                            exact_nums = [int(n) for n in re.findall(r"\d+", spec)]
                            if num in exact_nums:
                                chosen_row = r
                                break

        if not chosen_row:
            # Pick the "上記を除く" (general / default) row if available
            for r in matching_rows:
                if "上記を除く" in r["town_full"]:
                    chosen_row = r
                    break
            if not chosen_row:
                chosen_row = matching_rows[0]

    # Calculate next upcoming dates for all waste streams
    now = datetime.now()
    burnable_sched = compute_next_collection_date(chosen_row["burnable_days"], now)
    recyclable_sched = compute_next_collection_date(chosen_row["recyclable_days"], now)
    unburnable_sched = compute_next_collection_date(chosen_row["unburnable_days"], now)

    return {
        "municipality": chosen_row["municipality"],
        "municipality_display": chosen_row["municipality_display"],
        "town": chosen_row["town_full"],
        "sanitation_office": chosen_row["sanitation_office"],
        "is_special_commercial_zone": chosen_row["is_special_zone"],
        "schedules": {
            "burnable": {
                "days": chosen_row["burnable_raw"],
                "next": burnable_sched
            },
            "recyclable": {
                "days": chosen_row["recyclable_raw"],
                "next": recyclable_sched
            },
            "unburnable": {
                "days": chosen_row["unburnable_raw"],
                "next": unburnable_sched
            }
        }
    }
