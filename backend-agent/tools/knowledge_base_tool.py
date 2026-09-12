"""
Municipal Knowledge Base RAG Tool for Strands Agents.
Connects to Amazon Bedrock Knowledge Bases with strict metadata filtering by municipality,
with high-fidelity fallback rules for Tokyo (Shinjuku, Shibuya) and Kyoto.
"""
import os
import json
import boto3
from typing import Dict, Any, Optional

BEDROCK_KB_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID", "")
REGION = os.getenv("AWS_REGION", "us-east-1")

MUNICIPAL_RULES_FALLBACK = {
    "shinjuku": {
        "name": "Shinjuku City (新宿区)",
        "categories": {
            "burnable": {
                "jp_name": "燃やすごみ (可燃ごみ)",
                "rules": "Put in transparent or semitransparent bags. Includes kitchen food scraps, paper scraps, clothing, leather, rubber, dirty plastics.",
                "disposal_time": "By 8:00 AM at designated collection spot"
            },
            "unburnable": {
                "jp_name": "金属・陶器・ガラスごみ (不燃ごみ)",
                "rules": "Under 30cm. Includes cookware, metal items, ceramics, broken glass (wrap in thick paper and write 'キケン' / DANGER), light bulbs, empty spray cans/gas cassettes (must be completely empty, do NOT puncture).",
                "disposal_time": "By 8:00 AM twice a month"
            },
            "recyclable": {
                "jp_name": "資源ごみ",
                "subcategories": {
                    "pet_bottles": "Remove cap and outer label (place in plastic packaging), rinse bottle, crush flat.",
                    "cans": "Aluminum and steel cans. Rinse clean, do NOT crush.",
                    "glass_bottles": "Beverage and food jars. Rinse, remove metal/plastic lids.",
                    "paper": "Newspapers, cardboard (flatten and tie with paper cord), magazines, milk cartons (wash, open, dry)."
                }
            },
            "bulky_waste": {
                "jp_name": "粗大ごみ",
                "threshold_cm": 30,
                "rules": "Items where the longest side exceeds 30 cm. Advance reservation required. Purchase Paid Garbage Stickers (A ticket ¥200, B ticket ¥300).",
                "booking_url": "https://sodai.tokyokankyo.or.jp/",
                "phone": "03-5296-7000"
            }
        }
    },
    "shibuya": {
        "name": "Shibuya City (渋谷区)",
        "categories": {
            "burnable": {"jp_name": "可燃ごみ", "rules": "Kitchen waste, dirty paper, textiles. Set out by 8:00 AM."},
            "unburnable": {"jp_name": "不燃ごみ", "rules": "Items under 30cm. Spray cans must be emptied outside."},
            "recyclable": {"jp_name": "資源", "rules": "PET bottles, clean plastic containers with プラ mark, glass, cans."},
            "bulky_waste": {"jp_name": "粗大ごみ", "threshold_cm": 30, "booking_url": "https://sodai.tokyokankyo.or.jp/"}
        }
    },
    "kyoto": {
        "name": "Kyoto City (京都市)",
        "categories": {
            "burnable": {"jp_name": "燃やすごみ", "rules": "Must use official designated yellow transparent Kyoto City bags."},
            "recyclable_plastic": {"jp_name": "プラスチック製容器包装", "rules": "Clean plastic packaging with プラ mark in designated clear bags."},
            "cans_bottles_pet": {"jp_name": "缶・びん・ペットボトル", "rules": "Rinse and place in designated net bins."},
            "bulky_waste": {"jp_name": "大型ごみ", "threshold_cm": 50, "rules": "Items over 50cm. Advance booking required."}
        }
    }
}

def query_municipal_knowledge_base(item_name: str, material: str = "", municipality: str = "shinjuku") -> Dict[str, Any]:
    """
    Queries Amazon Bedrock Knowledge Base with metadata filtering by municipality.
    Falls back to curated municipal waste classification matrix if KB ID is not set.
    """
    muni_key = municipality.lower().replace("-ku", "").replace("-shi", "").strip()
    if muni_key not in MUNICIPAL_RULES_FALLBACK:
        muni_key = "shinjuku"

    # 1. Real Bedrock Knowledge Base Retrieval (if configured)
    if BEDROCK_KB_ID and os.getenv("AWS_ACCESS_KEY_ID"):
        try:
            client = boto3.client("bedrock-agent-runtime", region_name=REGION)
            query_text = f"How should {item_name} made of {material} be disposed in {municipality}?"
            response = client.retrieve(
                knowledgeBaseId=BEDROCK_KB_ID,
                retrievalQuery={"text": query_text},
                retrievalConfiguration={
                    "vectorSearchConfiguration": {
                        "numberOfResults": 3,
                        "filter": {
                            "equals": {
                                "key": "municipality",
                                "value": muni_key
                            }
                        }
                    }
                }
            )
            retrieval_results = response.get("retrievalResults", [])
            if retrieval_results:
                text_snippets = [r.get("content", {}).get("text", "") for r in retrieval_results]
                return {
                    "source": "Bedrock Knowledge Base (AOSS Vector Store)",
                    "municipality": muni_key,
                    "matched_guidance": " ".join(text_snippets),
                    "confidence": 0.95
                }
        except Exception as e:
            # Fallback to local deterministic matrix
            pass

    # 2. Local Knowledge Base Fallback
    muni_data = MUNICIPAL_RULES_FALLBACK.get(muni_key, MUNICIPAL_RULES_FALLBACK["shinjuku"])
    lower_item = item_name.lower()
    lower_mat = material.lower()

    requires_disassembly = False
    disassembly_notes = ""

    # Priority 1: Pressurized Spray / Gas / Aerosol (Hazardous, must be checked BEFORE regular cans)
    if any(k in lower_item or k in lower_mat for k in ["spray", "aerosol", "gas cassette", "スプレー缶", "カセットボンベ"]):
        category = "unburnable"
        category_jp = "金属・陶器・ガラスごみ (不燃ごみ - スプレー缶)"
        reason = "Dangerous Non-Burnable (Hazardous Pressurized Gas)"
        instructions = "MUST be completely used up until empty in a well-ventilated outdoor space. In Shinjuku, do NOT puncture hole. Place in transparent bag labeled 'スプレー缶'."
    elif "pet" in lower_item or "bottle" in lower_item or "ペットボトル" in lower_item:
        category = "recyclable_pet"
        category_jp = "資源ごみ (ペットボトル)"
        reason = "Resource Recyclable (PET Bottle)"
        instructions = "Step 1: Remove plastic cap. Step 2: Peel off plastic film label. Step 3: Rinse inside. Step 4: Flatten bottle."
        requires_disassembly = True
        disassembly_notes = "Cap and label go into Plastic Resource (プラマーク), bottle body goes into PET collection."
    elif any(k in lower_item or k in lower_mat for k in ["can", "aluminum", "steel", "缶"]):
        category = "recyclable_can"
        category_jp = "資源ごみ (缶)"
        reason = "Resource Recyclable (Metal Can)"
        instructions = "Rinse thoroughly. Do not crush cans in Shinjuku. Place in designated blue/yellow bin."
    elif any(k in lower_item or k in lower_mat for k in ["glass", "jar", "びん", "瓶"]):
        category = "recyclable_glass"
        category_jp = "資源ごみ (びん)"
        reason = "Resource Recyclable (Glass Bottle/Jar)"
        instructions = "Rinse bottle. Remove metal/plastic caps (discard with non-burnable or plastic). Place glass bottle upright in collection bin."
    elif any(k in lower_item or k in lower_mat for k in ["pan", "pot", "knife", "blade", "battery", "ceramic", "plate", "cup", "wire", "hairdryer", "iron"]):
        category = "unburnable"
        category_jp = "金属・陶器・ガラスごみ (不燃ごみ)"
        reason = "Non-Burnable Metal, Ceramic, or Small Appliance (<30cm)"
        instructions = "Place in transparent bag. If sharp (knife/broken ceramic), wrap safely in thick cardboard/newspaper and write 'キケン' (DANGER)."
    elif any(k in lower_item for k in ["cardboard", "ダンボール", "newspaper", "magazine", "milk carton"]):
        category = "recyclable_paper"
        category_jp = "資源ごみ (古紙)"
        reason = "Resource Recyclable (Used Paper)"
        instructions = "Flatten cardboard boxes and tie securely with paper twine/string. Do not put out on rainy days if possible."
    else:
        category = "burnable"
        category_jp = muni_data["categories"].get("burnable", {}).get("jp_name", "燃やすごみ (可燃ごみ)")
        reason = "General household burnable waste"
        instructions = muni_data["categories"].get("burnable", {}).get("rules", "Put in transparent or semitransparent bags. Tie securely.")

    return {
        "source": "Municipal Guideline Matrix",
        "municipality": muni_key,
        "municipality_display": muni_data["name"],
        "category": category,
        "category_jp": category_jp,
        "reason": reason,
        "instructions": instructions,
        "requires_disassembly": requires_disassembly,
        "disassembly_notes": disassembly_notes
    }
