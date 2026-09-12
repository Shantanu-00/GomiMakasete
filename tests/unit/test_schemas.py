"""
Unit tests for Pydantic schema validation.
"""
from src.shared.schemas import (
    DetectedItem,
    IntentCategory,
    PreparationActionType,
    PreparationPrescription
)

def test_detected_item_serialization():
    prep = PreparationPrescription(
        action_type=PreparationActionType.SEPARATE_PARTS,
        action_label="Separate Cap & Film",
        action_label_jp="分別",
        steps=["Step 1", "Step 2"]
    )
    item = DetectedItem(
        id="item-test-1",
        name="Plastic Soda Bottle",
        description="Empty bottle",
        material="PET",
        estimated_dim_cm=20.0,
        confidence=0.98,
        intent_category=IntentCategory.DISCARD_CANDIDATE,
        is_marked_for_disposal=True,
        preparation=prep
    )
    d = item.model_dump()
    assert d["id"] == "item-test-1"
    assert d["intent_category"] == "DISCARD_CANDIDATE"
    assert d["preparation"]["action_type"] == "SEPARATE_PARTS"
