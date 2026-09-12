"""
Integration Tests for Bedrock AgentCore Runtime HTTP Contract:
  - GET /ping
  - POST /invocations
"""
import pytest
from fastapi.testclient import TestClient
from src.backend.app import app

client = TestClient(app)

def test_agentcore_ping_contract():
    """Verify mandatory AgentCore lifecycle health check."""
    response = client.get("/ping")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["architecture"] == "linux/arm64"

def test_agentcore_invocations_detect():
    """Verify vision detection payload routing."""
    payload = {
        "input": {
            "action": "detect",
            "preset": "messy_desk",
            "force_tier2": False
        }
    }
    response = client.post("/invocations", json=payload)
    assert response.status_code == 200
    res = response.json()["output"]
    assert "items" in res
    assert res["safeguards_triggered"] >= 1
    # Check that iPhone is marked as SAFEGUARD_NON_WASTE
    iphone = next((i for i in res["items"] if "iPhone" in i["name"]), None)
    assert iphone is not None
    assert iphone["intent_category"] == "SAFEGUARD_NON_WASTE"
    assert iphone["is_marked_for_disposal"] is False

def test_agentcore_invocations_evaluate():
    """Verify batch evaluation of confirmed items."""
    payload = {
        "input": {
            "action": "evaluate",
            "neighborhood": "荒木町",
            "banchi": "22",
            "municipality": "tokyo_shinjuku",
            "items": [
                {"name": "Electric Rice Cooker", "material": "metal", "estimated_dim_cm": 34.0}
            ]
        }
    }
    response = client.post("/invocations", json=payload)
    assert response.status_code == 200
    res = response.json()["output"]
    assert "items" in res
    assert res["items"][0]["is_sodai_gomi"] is True
    assert res["items"][0]["sodai_details"]["fee_yen"] == 400

def test_agentcore_invocations_chat():
    """Verify conversational Q&A invocation."""
    payload = {
        "input": {
            "action": "chat",
            "prompt": "When is burnable trash collected in Aizumicho?"
        }
    }
    response = client.post("/invocations", json=payload)
    assert response.status_code == 200
    res = response.json()["output"]
    assert "message" in res
    assert len(res["message"]) > 10
