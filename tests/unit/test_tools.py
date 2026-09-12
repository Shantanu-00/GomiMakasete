"""
Unit Tests for GomiMakasete Strands Agent Tools.
"""
import pytest
from src.agent.tools.safeguard_tool import evaluate_safeguard_intent
from src.agent.tools.action_decomposition_tool import prescribe_preparation_action
from src.agent.tools.sodai_gomi_tool import evaluate_bulky_waste, calculate_stickers
from src.agent.tools.knowledge_base_tool import query_municipal_rules
from src.agent.tools.schedule_tool import lookup_neighborhood_schedule
from src.shared.schemas import IntentCategory, PreparationActionType

def test_safeguard_intent_detection():
    """Verify high-value personal assets are protected from accidental disposal."""
    # iPhone test
    intent, reason = evaluate_safeguard_intent("Apple iPhone 15 Pro")
    assert intent == IntentCategory.SAFEGUARD_NON_WASTE
    assert "cellular" in reason or "electronic" in reason

    # Keys test
    intent, reason = evaluate_safeguard_intent("Toyota Car Key Fob & House Keys")
    assert intent == IntentCategory.SAFEGUARD_NON_WASTE

    # Regular trash test
    intent, reason = evaluate_safeguard_intent("Empty Plastic Water Bottle")
    assert intent == IntentCategory.DISCARD_CANDIDATE
    assert reason == ""

def test_action_decomposition_prescriptions():
    """Verify physical preparation steps instead of naive split button."""
    # 1. Aerosol can -> Outdoor Degas (No Puncture)
    degas = prescribe_preparation_action("Aerosol Hair Spray Can", "metal")
    assert degas.action_type == PreparationActionType.OUTDOOR_DEGAS
    assert "FIRE HAZARD" in degas.safety_warning

    # 2. PET bottle -> Separate Parts & Rinse
    pet = prescribe_preparation_action("Green Tea PET Bottle", "plastic")
    assert pet.action_type == PreparationActionType.SEPARATE_PARTS
    assert pet.components is not None
    assert len(pet.components) == 3 # Body, Cap, Film

    # 3. Kitchen knife -> Safe Wrap Hazard
    knife = prescribe_preparation_action("Kitchen Chef Knife", "steel")
    assert knife.action_type == PreparationActionType.SAFE_WRAP_HAZARD
    assert "キケン" in knife.action_label_jp

    # 4. Cardboard box -> Bundle Twine
    box = prescribe_preparation_action("Shipping Cardboard Box", "paper")
    assert box.action_type == PreparationActionType.BUNDLE_CORD

def test_bulky_waste_and_appliance_act():
    """Verify Sodai Gomi calculations and statutory exclusions."""
    # Air Conditioner (Home Appliance Act exclusion)
    ac = evaluate_bulky_waste("Room Air Conditioner", 80.0, "tokyo_shinjuku")
    assert ac.is_sodai_gomi is True
    assert ac.is_restricted_appliance is True
    assert "家電リサイクル法" in ac.headline

    # Small frying pan (<30cm) -> Not Sodai Gomi
    pan = evaluate_bulky_waste("Small Frying Pan", 22.0, "tokyo_shinjuku")
    assert pan.is_sodai_gomi is False

    # Rice cooker (>30cm) -> Sodai Gomi ¥400
    cooker = evaluate_bulky_waste("Electric Rice Cooker", 34.0, "tokyo_shinjuku")
    assert cooker.is_sodai_gomi is True
    assert cooker.fee_yen == 400
    assert cooker.stickers.total_stickers == 2
    assert "A券" in cooker.stickers.summary

def test_municipal_knowledge_base_rules():
    """Verify municipal guideline mapping across Shinjuku, Yokohama, Kyoto, and Kamikatsu."""
    # Shinjuku PET
    shinjuku_pet = query_municipal_rules("PET Bottle", "plastic", "tokyo_shinjuku")
    assert shinjuku_pet["category"] == "recyclable_pet"

    # Kamikatsu Zero Waste
    kamikatsu_item = query_municipal_rules("Newspaper", "paper", "tokushima_kamikatsu")
    assert kamikatsu_item["category"] == "station_crates"

def test_neighborhood_schedule_and_banchi_splits():
    """Verify banchi resolution for Araki-cho splits."""
    # Banchi 22 -> 21 to 23
    sched_22 = lookup_neighborhood_schedule("荒木町", "22", "tokyo_shinjuku")
    assert "21から23番地" in sched_22["town"]

    # Banchi 5 -> Above excluded
    sched_5 = lookup_neighborhood_schedule("荒木町", "5", "tokyo_shinjuku")
    assert "上記を除く" in sched_5["town"]
