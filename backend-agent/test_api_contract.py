"""
Test AgentCore Runtime HTTP contract conformance:
  - GET /ping -> 200 {"status": "healthy"}
  - POST /invocations -> 200 with evaluations and detection
"""
import sys
import os
from fastapi.testclient import TestClient

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)

def test_ping_contract():
    print("--- 1. Testing AgentCore GET /ping Contract ---")
    response = client.get("/ping")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "healthy"
    print(f"PASS: /ping returned {data}")

def test_invocations_evaluate_contract():
    print("\n--- 2. Testing AgentCore POST /invocations (Evaluate) ---")
    payload = {
        "input": {
            "action": "evaluate",
            "neighborhood": "荒木町",
            "banchi": "22",
            "municipality": "shinjuku",
            "items": [
                {"name": "PET Bottle", "material": "plastic", "estimated_dim_cm": 25},
                {"name": "Electric Rice Cooker", "material": "metal", "estimated_dim_cm": 35}
            ]
        }
    }
    response = client.post("/invocations", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    res = response.json()
    assert "output" in res
    output = res["output"]
    assert output["neighborhood"] == "荒木町（21から23番地）"
    assert len(output["items"]) == 2
    print(f"PASS: /invocations resolved neighborhood {output['neighborhood']}")
    print(f"PASS: Burnable pickup: {output['schedules']['burnable']['days']}")
    print(f"PASS: Rice Cooker Sodai Gomi: {output['items'][1]['sodai_details']['stickers']['summary']}")

def test_invocations_detect_contract():
    print("\n--- 3. Testing AgentCore POST /invocations (Vision Detect) ---")
    payload = {
        "input": {
            "action": "detect",
            "image_base64": "" # Triggers sample inspection
        }
    }
    response = client.post("/invocations", json=payload)
    assert response.status_code == 200
    data = response.json()["output"]
    assert "detected_items" in data
    assert len(data["detected_items"]) > 0
    print(f"PASS: /invocations vision returned {len(data['detected_items'])} items.")

if __name__ == "__main__":
    test_ping_contract()
    test_invocations_evaluate_contract()
    test_invocations_detect_contract()
    print("\n🎉 ALL AGENTCORE HTTP CONTRACT TESTS PASSED!")
