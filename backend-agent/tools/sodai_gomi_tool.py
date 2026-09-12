"""
Sodai Gomi (Bulky Waste / 粗大ごみ) Fee & Sticker Calculation Tool.
Evaluates dimensions (>30cm), maps items to municipal catalog pricing,
and calculates the exact sticker combination (A券 ¥200 / B券 ¥300 in Tokyo).
"""
from typing import Dict, Any, List, Optional

# Home Appliance Recycling Act exclusions (Cannot be disposed as Sodai Gomi)
APPLIANCE_RECYCLING_ITEMS = [
    "air conditioner", "エアコン",
    "television", "tv", "テレビ",
    "refrigerator", "freezer", "冷蔵庫", "冷凍庫",
    "washing machine", "clothes dryer", "洗濯機", "衣類乾燥機",
    "personal computer", "pc", "desktop computer", "laptop", "パソコン"
]

# Curated catalog of standard Tokyo municipal sodai gomi rates
SODAI_CATALOG = {
    "microwave": {"jp_name": "電子レンジ", "fee": 400, "category": "Kitchen Appliance"},
    "toaster": {"jp_name": "トースター", "fee": 400, "category": "Kitchen Appliance"},
    "rice cooker": {"jp_name": "炊飯器", "fee": 400, "category": "Kitchen Appliance"},
    "vacuum cleaner": {"jp_name": "掃除機", "fee": 400, "category": "Home Appliance"},
    "fan": {"jp_name": "扇風機", "fee": 400, "category": "Seasonal Appliance"},
    "electric heater": {"jp_name": "電気ストーブ", "fee": 400, "category": "Seasonal Appliance"},
    "chair": {"jp_name": "いす (1人掛け)", "fee": 400, "category": "Furniture"},
    "office chair": {"jp_name": "回転いす", "fee": 800, "category": "Furniture"},
    "desk": {"jp_name": "机 (両袖除く)", "fee": 1200, "category": "Furniture"},
    "table": {"jp_name": "テーブル", "fee": 800, "category": "Furniture"},
    "bookshelf": {"jp_name": "本棚", "fee": 1200, "category": "Furniture"},
    "single mattress": {"jp_name": "マットレス (スプリングなし)", "fee": 1200, "category": "Bedding"},
    "futon": {"jp_name": "布団 (2枚まで1組)", "fee": 400, "category": "Bedding"},
    "carpet": {"jp_name": "カーペット (6畳未満)", "fee": 400, "category": "Floor Covering"},
    "bicycle": {"jp_name": "自転車 (16インチ以上)", "fee": 800, "category": "Leisure / Vehicle"},
    "suitcase": {"jp_name": "スーツケース", "fee": 400, "category": "Baggage / Luggage"},
    "guitar": {"jp_name": "ギター", "fee": 400, "category": "Musical Instrument"},
    "ironing board": {"jp_name": "アイロン台", "fee": 400, "category": "Daily Household"},
    "storage plastic box": {"jp_name": "衣装ケース", "fee": 400, "category": "Storage"}
}

def calculate_stickers(fee: int) -> Dict[str, Any]:
    """
    Computes optimal combination of Sticker A (¥200) and Sticker B (¥300).
    Preference: Minimize the total count of stickers while strictly matching the fee.
    """
    sticker_a_price = 200
    sticker_b_price = 300

    best_combo = None
    min_stickers = 999

    # Try all combinations of B (up to fee // 300) and fill remainder with A
    for b_count in range((fee // sticker_b_price) + 1):
        rem = fee - (b_count * sticker_b_price)
        if rem % sticker_a_price == 0:
            a_count = rem // sticker_a_price
            total_stickers = a_count + b_count
            if total_stickers < min_stickers:
                min_stickers = total_stickers
                best_combo = (a_count, b_count)

    if not best_combo:
        # Fallback: All A tickets
        a_count = fee // sticker_a_price
        best_combo = (a_count, 0)

    a_count, b_count = best_combo
    breakdown_parts = []
    if a_count > 0:
        breakdown_parts.append(f"{a_count}x Sticker A (A券 ¥200)")
    if b_count > 0:
        breakdown_parts.append(f"{b_count}x Sticker B (B券 ¥300)")

    return {
        "sticker_a_count": a_count,
        "sticker_b_count": b_count,
        "total_stickers": a_count + b_count,
        "summary": " + ".join(breakdown_parts),
        "total_cost_yen": fee
    }

def evaluate_sodai_gomi(
    item_name: str,
    dimensions_cm: Optional[float] = None,
    municipality: str = "shinjuku"
) -> Dict[str, Any]:
    """
    Evaluates an item for Bulky Waste (粗大ごみ) status.
    Returns pricing, sticker breakdown, booking links, and preparation instructions.
    """
    lower_item = item_name.lower().strip()

    # Check 1: Home Appliance Recycling Law (Cannot be disposed as Sodai Gomi)
    for appliance in APPLIANCE_RECYCLING_ITEMS:
        if appliance in lower_item:
            return {
                "is_sodai_gomi": True,
                "is_restricted_appliance": True,
                "headline": f"{item_name} is governed by the Home Appliance Recycling Act (家電リサイクル法).",
                "rules": (
                    "This item cannot be collected by municipal garbage collection. "
                    "You must arrange disposal through an appliance retail store (where purchased or replacing), "
                    "the Designated Collection Center (指定引取場所), or the Home Appliance Recycling Center."
                ),
                "action_url": "https://www.rkc.aeha.or.jp/",
                "phone": "0120-059-428"
            }

    # Check 2: Dimension threshold (> 30 cm in Tokyo special wards)
    threshold = 30.0
    dim = dimensions_cm if dimensions_cm is not None else 0.0
    is_oversized_by_dim = dim > threshold

    # Check 3: Match with Catalog
    matched_entry = None
    for key, data in SODAI_CATALOG.items():
        if key in lower_item or data["jp_name"] in lower_item:
            matched_entry = data
            break

    if not matched_entry and not is_oversized_by_dim:
        return {
            "is_sodai_gomi": False,
            "message": f"Item ({item_name}) under 30 cm belongs in regular Burnable, Non-burnable, or Recyclable streams."
        }

    # If matched in catalog, use catalog fee; otherwise estimate base fee ¥400 for standard items or ¥800 for large
    if matched_entry:
        official_name_jp = matched_entry["jp_name"]
        fee = matched_entry["fee"]
        category = matched_entry["category"]
    else:
        official_name_jp = f"大型品 ({item_name})"
        fee = 800 if dim > 80 else 400
        category = "General Bulky Waste"

    sticker_info = calculate_stickers(fee)

    return {
        "is_sodai_gomi": True,
        "is_restricted_appliance": False,
        "official_catalog_name_jp": official_name_jp,
        "category": category,
        "fee_yen": fee,
        "stickers": sticker_info,
        "booking_portal": "https://sodai.tokyokankyo.or.jp/",
        "phone_number": "03-5296-7000",
        "appointment_procedure": [
            f"1. Book an appointment online or by phone for item: '{official_name_jp}'.",
            f"2. Purchase disposal stickers at a local convenience store (7-Eleven, Lawson, FamilyMart): {sticker_info['summary']}.",
            "3. Write your Name or 4-digit Reservation Number and Collection Date on the stickers.",
            "4. Affix the stickers firmly to the item in an easily visible spot.",
            "5. Place the item outside your front entrance or designated drop spot by 8:00 AM on appointment day."
        ]
    }
