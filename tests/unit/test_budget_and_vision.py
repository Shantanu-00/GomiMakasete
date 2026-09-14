"""
Unit tests for Bedrock Hard Budget Guard ($5/day circuit breaker) and Vision Client.
"""
import pytest
from src.backend.budget_guard import DailyBudgetGuard, DAILY_BUDGET_LIMIT_USD
from src.agent.vision_client import BedrockVisionClient

def test_budget_guard_can_invoke_and_circuit_breaker(tmp_path, monkeypatch):
    test_file = str(tmp_path / "test_budget.json")
    monkeypatch.setattr("src.backend.budget_guard.BUDGET_FILE_PATH", test_file)
    monkeypatch.setattr("src.backend.budget_guard.DAILY_BUDGET_LIMIT_USD", 5.00)

    guard = DailyBudgetGuard()

    # Initial state should allow invocation
    can_run, spent, rem = guard.can_invoke(0.01)
    assert can_run is True
    assert spent == 0.0
    assert rem == 5.00

    # Record small usage
    cost = guard.record_usage("amazon.nova-lite-v1:0", input_tokens=1000, output_tokens=1000, num_images=1)
    assert cost > 0
    assert guard.get_daily_spend() > 0

    # Simulate near limit
    guard.record_usage("us.amazon.nova-pro-v1:0", input_tokens=1000000, output_tokens=1200000, num_images=10)
    status = guard.get_budget_status()
    assert status["spent_today_usd"] > 4.5

    # Trigger circuit breaker with another large request
    guard.record_usage("us.amazon.nova-pro-v1:0", input_tokens=500000, output_tokens=500000, num_images=10)
    can_run, spent, rem = guard.can_invoke(0.10)
    assert can_run is False
    assert rem == 0.0
    assert guard.get_budget_status()["is_circuit_breaker_tripped"] is True

def test_vision_client_physical_condition_detection():
    client = BedrockVisionClient()

    # Test Scenario 3 (Hazardous kitchen with broken bowl and gas canister)
    res = client.analyze_scene(preset="hazardous_kitchen")
    assert "items" in res
    assert len(res["items"]) >= 2

    # Check broken ceramic bowl triggers SAFE_WRAP_HAZARD
    bowl = next((i for i in res["items"] if "bowl" in i["name"].lower()), None)
    assert bowl is not None
    assert bowl["is_sharp_hazard"] is True
    assert bowl["preparation"]["action_type"] == "SAFE_WRAP_HAZARD"
    assert "キケン" in bowl["preparation"]["action_label_jp"]

    # Check gas canister triggers OUTDOOR_DEGAS
    gas = next((i for i in res["items"] if "gas" in i["name"].lower()), None)
    assert gas is not None
    assert gas["is_pressurized"] is True
    assert gas["preparation"]["action_type"] == "OUTDOOR_DEGAS"
