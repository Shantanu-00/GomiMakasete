"""
Unit & Integration Verification for GomiMakasete AgentCore Services.
"""
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend-agent is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tools.knowledge_base_tool import query_municipal_knowledge_base
from tools.schedule_tool import lookup_neighborhood_schedule
from tools.sodai_gomi_tool import evaluate_sodai_gomi
from agent import gomi_agent

def test_kb_tool():
    print("--- 1. Testing Bedrock Knowledge Base Tool ---")
    res = query_municipal_knowledge_base("PET Green Tea Bottle", "plastic", "shinjuku")
    assert res["category"] == "recyclable_pet", f"Expected recyclable_pet, got {res['category']}"
    assert res["requires_disassembly"] is True, "PET bottle should require disassembly"
    print(f"PASS: KB Tool classified bottle as {res['category_jp']} with disassembly notes.")

    # Aerosol spray test
    spray = query_municipal_knowledge_base("Hair spray aerosol can", "metal", "shinjuku")
    assert spray["category"] == "unburnable"
    print(f"PASS: KB Tool classified aerosol can as {spray['category_jp']} ({spray['reason']}).")

def test_sodai_gomi_tool():
    print("\n--- 2. Testing Sodai Gomi (Bulky Waste) Tool ---")
    # Small item (<30cm)
    small = evaluate_sodai_gomi("frying pan", 24.0, "shinjuku")
    assert small["is_sodai_gomi"] is False
    print("PASS: Small frying pan (<30cm) correctly rejected from Sodai Gomi.")

    # Rice cooker (>30cm)
    cooker = evaluate_sodai_gomi("electric rice cooker", 34.0, "shinjuku")
    assert cooker["is_sodai_gomi"] is True
    assert cooker["fee_yen"] == 400
    assert cooker["stickers"]["total_stickers"] == 2
    print(f"PASS: Rice Cooker (>30cm) correctly mapped to fee ¥{cooker['fee_yen']} ({cooker['stickers']['summary']}).")

    # Air conditioner (Restricted appliance)
    ac = evaluate_sodai_gomi("room air conditioner", 80.0, "shinjuku")
    assert ac["is_restricted_appliance"] is True
    print("PASS: Air Conditioner correctly flagged under Home Appliance Recycling Act.")

def test_schedule_tool():
    print("\n--- 3. Testing DynamoDB / Neighborhood Schedule Tool ---")
    # Test Araki-cho with banchi restriction
    sched_22 = lookup_neighborhood_schedule("荒木町", "22", "shinjuku")
    assert "21から23番地" in sched_22["town"], f"Expected 21-23 split, got {sched_22['town']}"
    print(f"PASS: Banchi 22 mapped to {sched_22['town']}. Burnable: {sched_22['schedules']['burnable']['days']}.")

    sched_5 = lookup_neighborhood_schedule("荒木町", "5", "shinjuku")
    assert "上記を除く" in sched_5["town"], f"Expected general split, got {sched_5['town']}"
    print(f"PASS: Banchi 5 mapped to {sched_5['town']}. Burnable: {sched_5['schedules']['burnable']['days']}.")

    # Next pickup check
    next_b = sched_22["schedules"]["burnable"]["next"]
    print(f"PASS: Next Burnable pickup calculated for: {next_b['next_date']} ({next_b['day_of_week']}) - {next_b['relative_label']}.")

def test_agent_batch():
    print("\n--- 4. Testing End-to-End Batch Evaluation ---")
    test_items = [
        {"id": "1", "name": "Plastic PET Bottle", "material": "PET", "estimated_dim_cm": 22.0},
        {"id": "2", "name": "Electric Microwave", "material": "metal/electronics", "estimated_dim_cm": 45.0},
        {"id": "3", "name": "Old Newspaper stack", "material": "paper", "estimated_dim_cm": 25.0}
    ]
    batch_res = gomi_agent.evaluate_items_batch(test_items, neighborhood="愛住町")
    assert len(batch_res["items"]) == 3
    print(f"PASS: Batch evaluated 3 items for {batch_res['neighborhood']}.")
    for it in batch_res["items"]:
        print(f"  - {it['name']}: {it['classification_jp']} | Sodai: {it['is_sodai_gomi']}")

if __name__ == "__main__":
    test_kb_tool()
    test_sodai_gomi_tool()
    test_schedule_tool()
    test_agent_batch()
    print("\n🎉 ALL BACKEND UNIT & INTEGRATION TESTS PASSED!")
