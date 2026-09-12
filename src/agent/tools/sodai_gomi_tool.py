"""
Sodai Gomi (Bulky Waste / 粗大ごみ) Tool.
Evaluates dimensions (>30cm/50cm), calculates municipal sticker fees, and flags statutory exclusions.
"""
from typing import Dict, Any, Optional
from src.shared.schemas import SodaiDetails, StickerBreakdown

APPLIANCE_RECYCLING_ITEMS = [
    "air conditioner", "エアコン",
    "television", "tv", "テレビ",
    "refrigerator", "freezer", "冷蔵庫", "冷凍庫",
    "washing machine", "clothes dryer", "洗濯機", "衣類乾燥機",
    "personal computer", "pc", "desktop computer", "laptop", "パソコン"
]

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
    "suitcase": {"jp_name": "スーツケース", "fee": 400, "category": "Baggage / Luggage"}
}

def calculate_stickers(fee: int) -> StickerBreakdown:
    sticker_a_price = 200
    sticker_b_price = 300

    best_combo = None
    min_stickers = 999

    for b_count in range((fee // sticker_b_price) + 1):
        rem = fee - (b_count * sticker_b_price)
        if rem % sticker_a_price == 0:
            a_count = rem // sticker_a_price
            total_stickers = a_count + b_count
            if total_stickers < min_stickers:
                min_stickers = total_stickers
                best_combo = (a_count, b_count)

    if not best_combo:
        a_count = fee // sticker_a_price
        best_combo = (a_count, 0)

    a_count, b_count = best_combo
    parts = []
    if a_count > 0:
        parts.append(f"{a_count}x Sticker A (A券 ¥200)")
    if b_count > 0:
        parts.append(f"{b_count}x Sticker B (B券 ¥300)")

    return StickerBreakdown(
        sticker_a_count=a_count,
        sticker_b_count=b_count,
        total_stickers=a_count + b_count,
        summary=" + ".join(parts),
        total_cost_yen=fee
    )

def evaluate_bulky_waste(item_name: str, dim_cm: float = 0.0, municipality: str = "shinjuku") -> SodaiDetails:
    lower_item = item_name.lower().strip()

    # 1. Home Appliance Recycling Law Exclusions
    for appliance in APPLIANCE_RECYCLING_ITEMS:
        if appliance in lower_item:
            return SodaiDetails(
                is_sodai_gomi=True,
                is_restricted_appliance=True,
                headline=f"{item_name} is governed by the Home Appliance Recycling Act (家電リサイクル法).",
                rules=(
                    "This item cannot be collected curbside. You must arrange disposal through an appliance retail store, "
                    "post office recycling ticket, or the certified e-waste partner."
                ),
                action_url="https://www.rkc.aeha.or.jp/",
                phone_number="0120-059-428"
            )

    # 2. Dimension Cutoff Check (> 30 cm in Tokyo special wards)
    threshold = 30.0 if municipality == "shinjuku" else 50.0
    is_oversized = dim_cm > threshold

    # 3. Catalog lookup
    matched = None
    for key, data in SODAI_CATALOG.items():
        if key in lower_item or data["jp_name"] in lower_item:
            matched = data
            break

    if not matched and not is_oversized:
        return SodaiDetails(is_sodai_gomi=False, is_restricted_appliance=False)

    official_name_jp = matched["jp_name"] if matched else f"大型品 ({item_name})"
    fee = matched["fee"] if matched else (800 if dim_cm > 80 else 400)
    category = matched["category"] if matched else "General Bulky Waste"
    stickers = calculate_stickers(fee)

    return SodaiDetails(
        is_sodai_gomi=True,
        is_restricted_appliance=False,
        official_catalog_name_jp=official_name_jp,
        category=category,
        fee_yen=fee,
        stickers=stickers,
        booking_portal="https://sodai.tokyokankyo.or.jp/",
        phone_number="03-5296-7000",
        appointment_procedure=[
            f"1. Book an appointment online or by phone for item: '{official_name_jp}'.",
            f"2. Purchase disposal stickers at convenience stores (7-Eleven, Lawson, FamilyMart): {stickers.summary}.",
            "3. Write your Name or 4-digit Reservation Number and Collection Date on the stickers.",
            "4. Affix stickers firmly to the item in an easily visible spot.",
            "5. Place the item outside your front entrance or collection point by 8:00 AM on appointment day."
        ]
    )
