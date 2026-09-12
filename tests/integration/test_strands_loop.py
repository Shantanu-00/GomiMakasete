"""
Integration tests for the Strands Agents SDK Orchestrator Loop.
"""
from src.agent.orchestrator import orchestrator

def test_orchestrator_batch_evaluation():
    test_items = [
        {"id": "1", "name": "Green Tea PET Bottle", "material": "PET #1", "estimated_dim_cm": 22.0},
        {"id": "2", "name": "Aerosol Deodorant Spray", "material": "Steel", "estimated_dim_cm": 18.0}
    ]
    res = orchestrator.evaluate_batch(test_items, neighborhood="愛住町", municipality="tokyo_shinjuku")
    assert len(res["items"]) == 2
    assert res["items"][0]["classification"] == "recyclable_pet"
    assert res["items"][1]["classification"] == "unburnable"

def test_orchestrator_chat_interaction():
    reply = orchestrator.chat_interact("When is recyclable pickup in Araki-cho?")
    assert len(reply) > 10
    assert "Araki" in reply or "荒木町" in reply or "burnable" in reply.lower() or "recyclable" in reply.lower()
