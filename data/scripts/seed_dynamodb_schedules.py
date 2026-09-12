"""
DynamoDB Schedule Table Seeder.
Batch-loads 178 Japanese Municipal Neighborhoods & Waste Patterns into Amazon DynamoDB.
Safe and idempotent: runs in batches with automatic exponential backoff.
"""
import os
import json
import boto3
from typing import Dict, Any, List

REGION = os.getenv("AWS_REGION", "us-east-1")
TABLE_NAME = os.getenv("DYNAMODB_SCHEDULE_TABLE", "GomiSchedules-prod")

def seed_schedules():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    neigh_path = os.path.join(base_dir, "neighborhoods.json")
    pattern_path = os.path.join(base_dir, "patterns.json")

    print(f"==> Reading neighborhoods from {neigh_path}...")
    with open(neigh_path, "r", encoding="utf-8") as f:
        neighborhoods = json.load(f)

    print(f"==> Reading patterns from {pattern_path}...")
    with open(pattern_path, "r", encoding="utf-8") as f:
        patterns = json.load(f)

    pattern_map = {p["pattern_id"]: p for p in patterns}

    print(f"==> Connecting to DynamoDB Table '{TABLE_NAME}' in {REGION}...")
    try:
        dynamodb = boto3.resource("dynamodb", region_name=REGION)
        table = dynamodb.Table(TABLE_NAME)

        # Use batch_writer for efficient batch writes
        count = 0
        with table.batch_writer() as batch:
            for item in neighborhoods:
                pid = item.get("pattern_id")
                pattern_data = pattern_map.get(pid, {})

                ddb_item = {
                    "PK": f"MUNICIPALITY#{item['municipality_id']}",
                    "SK": f"NEIGHBORHOOD#{item['neighborhood_id']}",
                    "neighborhood_id": item["neighborhood_id"],
                    "municipality_id": item["municipality_id"],
                    "name_en": item.get("name_en", ""),
                    "name_ja": item.get("name_ja", ""),
                    "postal_code": item.get("postal_code", ""),
                    "pattern_id": pid,
                    "address_range": item.get("address_range"),
                    "schedule_details": pattern_data.get("schedule", {})
                }

                batch.put_item(Item=ddb_item)
                count += 1

        print(f"SUCCESS: Seeded {count} neighborhoods into DynamoDB table '{TABLE_NAME}'!")
    except Exception as e:
        print(f"ERROR: Seeding failed: {e}")
        print("Note: Ensure your AWS credentials are valid and the table exists via SAM deployment.")

if __name__ == "__main__":
    seed_schedules()
