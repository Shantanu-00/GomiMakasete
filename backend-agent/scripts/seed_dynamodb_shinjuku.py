"""
Seed DynamoDB Table 'GomiSchedules' with complete Shinjuku-ku neighborhood garbage schedules.
Supports both real AWS DynamoDB ingestion (via boto3) and local export for offline / local-dev mode.
"""
import os
import re
import json
import boto3
from typing import List, Dict, Any

TABLE_NAME = os.getenv("DYNAMODB_SCHEDULE_TABLE", "GomiSchedules")
REGION = os.getenv("AWS_REGION", "us-east-1")

def parse_day_string(day_str: str) -> List[str]:
    """Normalize Japanese weekday strings into structured tokens."""
    if not day_str or day_str == "*":
        return ["Daily / Special Commercial Collection"]
    
    # Split on delimiters like ・ or 、
    tokens = [t.strip() for t in re.split(r"[・、\s]+", day_str) if t.strip()]
    return tokens

def normalize_row(row: List[str]) -> Dict[str, Any]:
    kana = row[0]
    raw_town = row[1]
    recyclables_raw = row[2]
    burnable_raw = row[3]
    unburnable_raw = row[4]
    sanitation_office = row[5]
    pdf_link = row[6] if len(row) > 6 else ""

    # Check for banchi restriction
    match = re.search(r"（(.*?)）", raw_town)
    banchi_spec = match.group(1) if match else "all"
    clean_town = re.sub(r"（.*?）", "", raw_town).strip()

    return {
        "PK": "MUNICIPALITY#SHINJUKU",
        "SK": f"NEIGHBORHOOD#{raw_town}",
        "municipality": "shinjuku",
        "municipality_display": "Shinjuku-ku (新宿区)",
        "kana": kana,
        "town_full": raw_town,
        "town_clean": clean_town,
        "banchi_spec": banchi_spec,
        "recyclable_days": parse_day_string(recyclables_raw),
        "recyclable_raw": recyclables_raw,
        "burnable_days": parse_day_string(burnable_raw),
        "burnable_raw": burnable_raw,
        "unburnable_days": parse_day_string(unburnable_raw),
        "unburnable_raw": unburnable_raw,
        "sanitation_office": "East Shinjuku" if sanitation_office == "東" else "Kabukicho / Commercial",
        "is_special_zone": (burnable_raw == "*" or recyclables_raw == "*")
    }

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_path = os.path.abspath(os.path.join(script_dir, "../../all_shinjuku_rows.json"))
    output_json_path = os.path.abspath(os.path.join(script_dir, "../data/shinjuku_normalized.json"))
    
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)

    with open(source_path, "r", encoding="utf-8") as f:
        raw_rows = json.load(f)

    normalized_items = [normalize_row(r) for r in raw_rows]

    # Save local normalized cache
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(normalized_items, f, ensure_ascii=False, indent=2)

    import sys
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print(f"[SUCCESS] Successfully normalized {len(normalized_items)} Shinjuku neighborhood schedules.")
    print(f"[OUTPUT] Saved to {output_json_path}")

    # Check for AWS credentials to seed DynamoDB
    if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("SEED_AWS_DYNAMODB"):
        print(f"Connecting to DynamoDB table '{TABLE_NAME}' in region {REGION}...")
        dynamodb = boto3.resource("dynamodb", region_name=REGION)
        table = dynamodb.Table(TABLE_NAME)

        with table.batch_writer() as batch:
            for item in normalized_items:
                batch.put_item(Item=item)
        print(f"🚀 Ingested {len(normalized_items)} records into DynamoDB table {TABLE_NAME}.")
    else:
        print("ℹ️ AWS credentials or SEED_AWS_DYNAMODB not set. Local normalized JSON ready for runtime fallback.")

if __name__ == "__main__":
    main()
