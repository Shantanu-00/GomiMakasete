"""
Unit Tests for Knowledge Base-to-Schedule Mapping Bridge & Multi-City Edge Cases.
"""
import pytest
from src.agent.tools.knowledge_base_tool import query_municipal_rules
from src.agent.tools.schedule_tool import lookup_neighborhood_schedule, resolve_item_schedule
from src.agent.orchestrator import orchestrator

def test_shinjuku_pet_bottle_bridge():
    """Verify Shinjuku PET bottle collapses onto 'resources' schedule channel."""
    rules = query_municipal_rules("PET Beverage Bottle", "plastic", "tokyo_shinjuku")
    assert rules["category"] == "recyclable_pet"
    assert rules["schedule_key"] == "resources"
    assert "Green station net" in rules["bag_rule"]

    # Lookup neighborhood (Aizumicho: PATTERN_SHINJUKU_10)
    sched = lookup_neighborhood_schedule("愛住町", municipality="tokyo_shinjuku")
    item_sched = resolve_item_schedule(rules["schedule_key"], sched["schedules"])
    assert "Thursday" in item_sched["pickup_day"] or "木曜日" in item_sched["pickup_day"]

def test_shinjuku_spray_can_edge_case():
    """Verify Shinjuku spray cans go to metal_ceramics_glass in an isolated bag without puncture."""
    rules = query_municipal_rules("Aerosol Spray Can", "metal", "tokyo_shinjuku")
    assert rules["schedule_key"] == "metal_ceramics_glass"
    assert "DO NOT PUNCTURE" in rules["special_warning"]
    assert "スプレー缶" in rules["bag_rule"]

def test_yokohama_split_resource_days():
    """Verify Yokohama splits plastic packaging and cans/bottles onto separate schedule channels."""
    pla_rules = query_municipal_rules("Plastic Snack Wrapper", "plastic", "kanagawa_yokohama")
    assert pla_rules["schedule_key"] == "plastic_packaging"

    can_rules = query_municipal_rules("Aluminum Beer Can", "metal", "kanagawa_yokohama")
    assert can_rules["schedule_key"] == "cans_bottles_pet"

    # In Minato Mirai 2-chome (PATTERN_YOKOHAMA_01):
    # plastic_packaging is Monday, cans_bottles_pet is Friday
    sched = lookup_neighborhood_schedule("Minato Mirai", municipality="kanagawa_yokohama")
    pla_sched = resolve_item_schedule(pla_rules["schedule_key"], sched["schedules"])
    can_sched = resolve_item_schedule(can_rules["schedule_key"], sched["schedules"])

    assert "Monday" in pla_sched["pickup_day"]
    assert "Friday" in can_sched["pickup_day"]
    assert pla_sched["pickup_day"] != can_sched["pickup_day"]

def test_yokohama_clothing_rain_cancellation():
    """Verify Yokohama used clothing has the statutory rain cancellation warning."""
    cloth_rules = query_municipal_rules("Winter Wool Jacket", "cloth", "kanagawa_yokohama")
    assert cloth_rules["schedule_key"] == "clothing"
    assert "RAIN CANCELLATION" in cloth_rules["special_warning"]

def test_kyoto_ceramics_in_combustible_bag():
    """Verify Kyoto reroutes broken ceramics/dishware to Combustible Yellow Bag."""
    dish_rules = query_municipal_rules("Broken Ceramic Dish", "ceramic", "kyoto_kyoto")
    assert dish_rules["schedule_key"] == "combustible"
    assert "YELLOW BAG" in dish_rules["bag_rule"]
    assert "KYOTO RULE" in dish_rules["special_warning"]
    assert "キケン" in dish_rules["disposal_rules"]

def test_kyoto_small_metal_free_bag_rule():
    """Verify Kyoto small metals use a free clear bag with '金属' marker."""
    metal_rules = query_municipal_rules("Small Frying Pan", "steel", "kyoto_kyoto")
    assert metal_rules["schedule_key"] == "small_metal_sprays"
    assert "Free clear bag" in metal_rules["bag_rule"]
    assert "金属" in metal_rules["bag_rule"]

def test_kamikatsu_zero_waste_and_compost_mandate():
    """Verify Kamikatsu maps to station_dropoff and enforces home compost for food."""
    paper_rules = query_municipal_rules("Cardboard Box", "paper", "tokushima_kamikatsu")
    assert paper_rules["schedule_key"] == "station_dropoff"
    assert paper_rules["category"] == "station_crates"

    food_rules = query_municipal_rules("Raw Kitchen Vegetable Waste", "food", "tokushima_kamikatsu")
    assert food_rules["schedule_key"] == "home_compost"
    assert "Home Composting Mandate" in food_rules["special_warning"]

def test_orchestrator_batch_evaluation_with_schedule_bridge():
    """Verify orchestrator batch evaluation populates item-level pickup dates and bag rules."""
    items = [
        {"id": "item-1", "name": "Green Tea PET Bottle", "material": "plastic", "estimated_dim_cm": 20.0},
        {"id": "item-2", "name": "Ceramic Coffee Mug", "material": "ceramic", "estimated_dim_cm": 10.0},
        {"id": "item-3", "name": "Aerosol Deodorant Spray", "material": "metal", "estimated_dim_cm": 15.0}
    ]

    res = orchestrator.evaluate_batch(items, neighborhood="愛住町", municipality="tokyo_shinjuku")
    evaluated = res["items"]
    assert len(evaluated) == 3

    # PET Bottle should have schedule_key resources and Thursday pickup in Aizumicho
    pet_item = evaluated[0]
    assert pet_item["schedule_key"] == "resources"
    assert "Thursday" in pet_item["pickup_day"] or "木曜日" in pet_item["pickup_day"]
    assert pet_item["bag_rule"] is not None

    # Ceramic Mug should have metal_ceramics_glass
    mug_item = evaluated[1]
    assert mug_item["schedule_key"] == "metal_ceramics_glass"
    assert mug_item["pickup_day"] is not None

    # Spray Can should have metal_ceramics_glass and safety warning
    spray_item = evaluated[2]
    assert spray_item["schedule_key"] == "metal_ceramics_glass"
    assert "DO NOT PUNCTURE" in spray_item["special_warning"]
