"""
Bedrock Knowledge Base RAG Tool with Municipal Metadata Filtering.
Reads official guidelines for Shinjuku, Yokohama, Kyoto, and Kamikatsu.
"""
import os
import json
from typing import Dict, Any, Optional
import boto3
from src.shared.logger import get_logger

logger = get_logger("knowledge_base_tool")
BEDROCK_KB_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID", "")
REGION = os.getenv("AWS_REGION", "us-east-1")

MUNICIPALITY_MAP = {
    "shinjuku": "tokyo_shinjuku",
    "tokyo_shinjuku": "tokyo_shinjuku",
    "yokohama": "kanagawa_yokohama",
    "kanagawa_yokohama": "kanagawa_yokohama",
    "kyoto": "kyoto_kyoto",
    "kyoto_kyoto": "kyoto_kyoto",
    "kamikatsu": "tokushima_kamikatsu",
    "tokushima_kamikatsu": "tokushima_kamikatsu"
}

def query_municipal_rules(item_name: str, material: str = "", municipality: str = "tokyo_shinjuku") -> Dict[str, Any]:
    """
    Queries Amazon Bedrock Knowledge Base using metadata filtering by municipality_id.
    Falls back to local verified rules archive in data/ directory.
    """
    muni_key = MUNICIPALITY_MAP.get(municipality.lower(), "tokyo_shinjuku")

    # 1. AWS Bedrock Knowledge Base Retrieval (if configured)
    if BEDROCK_KB_ID and os.getenv("AWS_ACCESS_KEY_ID"):
        try:
            client = boto3.client("bedrock-agent-runtime", region_name=REGION)
            response = client.retrieve(
                knowledgeBaseId=BEDROCK_KB_ID,
                retrievalQuery={"text": f"How should {item_name} ({material}) be sorted in {muni_key}?"},
                retrievalConfiguration={
                    "vectorSearchConfiguration": {
                        "numberOfResults": 2,
                        "filter": {
                            "equals": {
                                "key": "municipality_id",
                                "value": muni_key
                            }
                        }
                    }
                }
            )
            results = response.get("retrievalResults", [])
            if results:
                content = " ".join([r.get("content", {}).get("text", "") for r in results])
                return {
                    "source": "Bedrock Knowledge Base (OpenSearch Serverless)",
                    "municipality_id": muni_key,
                    "guidance": content,
                    "confidence": 0.95
                }
        except Exception as e:
            logger.warning(f"Bedrock KB query bypassed: {e}")

    # 2. Local Verified Guideline Analysis (Using data/ directory)
    lower = item_name.lower()
    lower_mat = material.lower()

    category = "burnable"
    category_jp = "燃やすごみ (可燃ごみ)"
    rules = "Put in transparent/semi-transparent bags. Tie securely. Place out before 8:00 AM."
    requires_disassembly = False
    disassembly_notes = ""
    schedule_key = "combustible"
    bag_rule = "Generic transparent/semi-transparent bag (≤45L)"
    special_warning = None

    # Kamikatsu 45-Category Zero Waste Check
    if muni_key == "tokushima_kamikatsu":
        category = "station_crates"
        category_jp = "ゼロ・ウェイストセンター持込分別"
        rules = "Kamikatsu has zero curbside trucks. Bring to Why? Station (07:30 - 14:00) and sort into dedicated crates."
        schedule_key = "station_dropoff"
        bag_rule = "No bags required (Empty by hand into reusable crates)"
        if any(k in lower or k in lower_mat for k in ["food", "scrap", "raw food", "kitchen waste", "vegetable", "生ごみ", "残飯"]):
            special_warning = "100% Home Composting Mandate: Raw kitchen waste is strictly prohibited at Why? Station."
            schedule_key = "home_compost"
            category = "home_compost"
            category_jp = "生ごみ (自宅コンポスト堆肥化)"
            rules = "100% of households compost raw food at home. Zero raw food allowed at Why? Station."

    # Hazardous Aerosol / Gas Cans
    elif any(k in lower or k in lower_mat for k in ["spray", "aerosol", "gas cassette", "スプレー缶", "カセットボンベ"]):
        category = "unburnable"
        category_jp = "金属・陶器・ガラスごみ (不燃ごみ - スプレー缶)"
        rules = "Completely exhaust outdoors until empty. DO NOT PUNCTURE. Place in separate transparent bag labeled 'スプレー缶'."
        special_warning = "DO NOT PUNCTURE: Puncturing indoors causes garbage truck fires. Depress nozzle outdoors until silent."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "metal_ceramics_glass"
            bag_rule = "Separate transparent bag labeled 'スプレー缶'"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "cans_bottles_pet"
            bag_rule = "Separate transparent bag labeled 'スプレー缶' (Put out on Cans/Bottles day)"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "small_metal_sprays"
            bag_rule = "Free clear bag with '金属' written in marker"

    # PET Bottles
    elif any(k in lower for k in ["pet", "bottle", "ペットボトル"]):
        category = "recyclable_pet"
        category_jp = "資源ごみ (ペットボトル)"
        rules = "Step 1: Cap off. Step 2: Peel film label. Step 3: Rinse inside. Step 4: Crush flat."
        requires_disassembly = True
        disassembly_notes = "Cap and label go to Plastic Resource (プラマーク), bottle body goes to PET collection."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "resources"
            bag_rule = "Green station net or clear bag"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "cans_bottles_pet"
            bag_rule = "Station net or clear bag (Cans/Bottles/PET day)"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "cans_bottles_pet"
            bag_rule = "MANDATORY CLEAR BAG (Green text) or station cage"

    # Metals Cookware / Cutlery (Must precede beverage cans so steel pans don't match 'steel'!)
    elif any(k in lower or k in lower_mat for k in ["pan", "pot", "knife", "blade", "wire", "hairdryer", "frying pan", "saucepan", "kettle", "cutlery", "fork", "spoon"]):
        category = "unburnable"
        category_jp = "金属・陶器・ガラスごみ (不燃ごみ)"
        rules = "Longest edge must be under 30cm. If sharp, wrap in thick newspaper and write 'キケン' (DANGER)."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "metal_ceramics_glass"
            bag_rule = "Generic transparent bag (Wrap blades in paper marked 'キケン')"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "small_metal"
            bag_rule = "Direct without bag or transparent bag"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "small_metal_sprays"
            bag_rule = "Free clear bag (Must write '金属' in marker on bag)"

    # Metal Cans
    elif any(k in lower for k in ["can", "缶"]) or ("can" in lower and any(m in lower_mat for m in ["aluminum", "steel", "tin"])):
        category = "recyclable_can"
        category_jp = "資源ごみ (缶)"
        rules = "Rinse clean. Do not crush completely flat. Place in designated blue station basket."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "resources"
            bag_rule = "Blue station basket (loose)"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "cans_bottles_pet"
            bag_rule = "Station can basket or clear bag"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "cans_bottles_pet"
            bag_rule = "MANDATORY CLEAR BAG (Green text) or station cage"

    # Glass Bottles
    elif any(k in lower or k in lower_mat for k in ["glass", "jar", "びん", "瓶"]) and not any(k in lower for k in ["broken", "plate", "dish", "mug"]):
        category = "recyclable_glass"
        category_jp = "資源ごみ (びん)"
        rules = "Rinse bottle. Remove metal/plastic caps. Place upright in yellow/orange station container."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "resources"
            bag_rule = "Yellow/Orange station bottle crate"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "cans_bottles_pet"
            bag_rule = "Station bottle crate"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "cans_bottles_pet"
            bag_rule = "MANDATORY CLEAR BAG (Green text) or station crate"

    # Metals Cookware / Cutlery
    elif any(k in lower or k in lower_mat for k in ["pan", "pot", "knife", "blade", "wire", "hairdryer", "metal", "鉄", "スチール", "アルミ"]):
        category = "unburnable"
        category_jp = "金属・陶器・ガラスごみ (不燃ごみ)"
        rules = "Longest edge must be under 30cm. If sharp, wrap in thick newspaper and write 'キケン' (DANGER)."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "metal_ceramics_glass"
            bag_rule = "Generic transparent bag (Wrap blades in paper marked 'キケン')"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "small_metal"
            bag_rule = "Direct without bag or transparent bag"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "small_metal_sprays"
            bag_rule = "Free clear bag (Must write '金属' in marker on bag)"

    # Ceramics & Glassware
    elif any(k in lower or k in lower_mat for k in ["ceramic", "plate", "dish", "mug", "pottery", "陶器", "陶磁器", "drinking glass", "broken"]):
        category = "unburnable"
        category_jp = "金属・陶器・ガラスごみ (不燃ごみ)"
        rules = "Wrap broken shards securely in thick paper and write 'キケン' (DANGER)."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "metal_ceramics_glass"
            bag_rule = "Generic transparent bag marked 'キケン'"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "non_combustible"
            bag_rule = "Generic transparent bag marked 'キケン'"
        elif muni_key == "kyoto_kyoto":
            # Kyoto Unique Rule: Ceramics go in Combustible Yellow Bag!
            category = "combustible"
            category_jp = "燃やすごみ (陶磁器・ガラス)"
            schedule_key = "combustible"
            bag_rule = "MANDATORY YELLOW BAG (Red text)"
            rules = "Kyoto Unique Rule: Wrap shards securely in paper marked 'キケン' and place in the Yellow Combustible bag (melted into roadbed slag)."
            special_warning = "KYOTO RULE: No curbside non-burnable stream. Broken ceramics and glass go into the YELLOW Combustible Bag."

    # Textiles & Clothing
    elif any(k in lower or k in lower_mat for k in ["cloth", "shirt", "trousers", "jacket", "towel", "textile", "古布", "衣類"]):
        if muni_key == "kanagawa_yokohama":
            category = "clothing"
            category_jp = "古布 (衣類)"
            schedule_key = "clothing"
            rules = "Pack clean and dry in transparent bags. Collected weekly by citizen recycling groups."
            special_warning = "RAIN CANCELLATION: Never put clothes out if it is raining! Wet clothes turn moldy and cannot be recycled."
        else:
            category = "burnable"
            category_jp = "燃やすごみ (古布・衣類)"
            schedule_key = "combustible"
            rules = "Place out in transparent bag on combustible collection day."

    # Clean Plastic Packaging (Pla-mark)
    elif any(k in lower or k in lower_mat for k in ["plastic", "tray", "wrapper", "bag", "pouch", "プラマーク"]):
        category = "recyclable_plastic"
        category_jp = "容器包装プラスチック"
        rules = "Rinse and wipe off food residue. If stubborn grease remains, throw into combustible."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "resources"
            bag_rule = "Generic transparent bag"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "plastic_packaging"
            bag_rule = "Generic transparent bag (Covers Pla-mark and 100% plastic goods <50cm)"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "plastic_packaging"
            bag_rule = "MANDATORY CLEAR BAG (Green text)"

    # Cardboard & Paper
    elif any(k in lower for k in ["cardboard", "ダンボール", "newspaper", "magazine", "milk carton", "paper"]):
        category = "recyclable_paper"
        category_jp = "資源ごみ (古紙)"
        rules = "Flatten cardboard boxes and tie firmly in a cross (+) with paper twine. Do not use vinyl tape."
        if muni_key == "tokyo_shinjuku":
            schedule_key = "resources"
        elif muni_key == "kanagawa_yokohama":
            schedule_key = "used_paper"
        elif muni_key == "kyoto_kyoto":
            schedule_key = "miscellaneous_paper"

    # Default Combustible
    else:
        if muni_key == "kyoto_kyoto":
            bag_rule = "MANDATORY YELLOW BAG (Red text)"

    return {
        "source": "Local Municipal Guidelines Matrix",
        "municipality_id": muni_key,
        "category": category,
        "category_jp": category_jp,
        "disposal_rules": rules,
        "requires_disassembly": requires_disassembly,
        "disassembly_notes": disassembly_notes,
        "schedule_key": schedule_key,
        "bag_rule": bag_rule,
        "special_warning": special_warning
    }
