"""
Action Decomposition Tool: Prescribes verified municipal physical preparation steps.
Replaces naive 'dumb split' buttons with actionable physical protocols.
"""
from typing import Dict, Any, List
from src.shared.schemas import (
    PreparationPrescription,
    PreparationActionType,
    SeparableComponent
)

def prescribe_preparation_action(item_name: str, material: str = "") -> PreparationPrescription:
    """
    Decomposes an item into a structured physical preparation protocol before disposal.
    """
    lower = item_name.lower()
    mat_lower = material.lower()

    # 1. Pressurized Aerosol / Gas Cassettes -> OUTDOOR DEGASSING
    if any(k in lower or k in mat_lower for k in ["spray", "aerosol", "gas cassette", "スプレー缶", "カセットボンベ", "butane"]):
        return PreparationPrescription(
            action_type=PreparationActionType.OUTDOOR_DEGAS,
            action_label="Outdoor Degas & Do Not Puncture",
            action_label_jp="屋外ガス抜き・穴あけ禁止",
            badge_color="rose",
            safety_warning="FIRE HAZARD: Indoor puncturing or discarding with gas causes garbage truck fires. Must be completely emptied outdoors.",
            steps=[
                "1. Take canister outdoors to a breezy open space away from sparks and ignition sources.",
                "2. Depress nozzle or lock degassing mechanism until all hissing stops completely.",
                "3. Verify the can feels empty and light.",
                "4. Place in separate transparent bag labeled 'スプレー缶' (Do not puncture)."
            ]
        )

    # 2. PET Bottles -> COMPONENT SEPARATION & RINSE
    if any(k in lower for k in ["pet", "bottle", "ペットボトル"]):
        return PreparationPrescription(
            action_type=PreparationActionType.SEPARATE_PARTS,
            action_label="Separate Cap & Film + Rinse",
            action_label_jp="キャップ・ラベル分別・水洗い",
            badge_color="cyan",
            steps=[
                "1. Unscrew plastic bottle cap by hand.",
                "2. Peel off plastic shrink-wrap film label along perforated line.",
                "3. Lightly rinse bottle inside with clean water to remove sweet residue.",
                "4. Step on bottle to crush it flat for compact collection."
            ],
            components=[
                SeparableComponent(name="PET Bottle Body", material="PET Plastic #1", destination_stream="PET Resource (資源ペットボトル)"),
                SeparableComponent(name="Bottle Cap", material="Polypropylene (PP #5)", destination_stream="Plastic Containers (プラマーク)"),
                SeparableComponent(name="Vinyl Film Label", material="Plastic Film", destination_stream="Plastic Containers (プラマーク)")
            ]
        )

    # 3. Sharp Hazards (Knives, Broken Glass, Ceramics, Blades) -> SAFE WRAP HAZARD
    if any(k in lower for k in ["knife", "blade", "broken", "glass", "ceramic", "razor", "plate", "bulb", "mirror", "包丁", "割れ物"]):
        return PreparationPrescription(
            action_type=PreparationActionType.SAFE_WRAP_HAZARD,
            action_label="Safe Wrap & Mark Danger",
            action_label_jp="厚紙包装・「キケン」明記",
            badge_color="amber",
            safety_warning="Sanitation Worker Safety: Sharp edges and broken shards must be securely wrapped to avoid lacerations.",
            steps=[
                "1. Wrap sharp edges or broken shards in several layers of thick newspaper or cardboard.",
                "2. Fasten the wrapping securely with duct tape so no edge can pierce through.",
                "3. Using a red permanent marker, write boldly: 「キケン」 (DANGER).",
                "4. Place into designated Non-Burnable (金属・陶器・ガラス) collection bag."
            ]
        )

    # 4. Food Containers & Cans -> RINSE AND DRY
    if any(k in lower or k in mat_lower for k in ["can", "aluminum", "steel", "milk carton", "tray", "sauce", "jam", "缶", "牛乳パック"]):
        return PreparationPrescription(
            action_type=PreparationActionType.RINSE_AND_DRY,
            action_label="Rinse & Dry Thoroughly",
            action_label_jp="水洗い・乾燥",
            badge_color="emerald",
            steps=[
                "1. Rinse beverage, milk, or sauce residue with tap water.",
                "2. Invert and let dry on a dish rack or paper towel.",
                "3. If milk carton: Cut open flat with scissors, wash, and dry completely.",
                "4. Do not crush aluminum beverage cans in Tokyo special wards."
            ]
        )

    # 5. Cardboard Boxes & Paper -> BUNDLE WITH TWINE
    if any(k in lower for k in ["cardboard", "ダンボール", "newspaper", "magazine", "paper box"]):
        return PreparationPrescription(
            action_type=PreparationActionType.BUNDLE_CORD,
            action_label="Bundle with Paper Twine",
            action_label_jp="紙ひも結束・平らに畳む",
            badge_color="purple",
            steps=[
                "1. Remove all plastic shipping tape, delivery slips, and styrofoam inserts.",
                "2. Flatten all cardboard boxes completely.",
                "3. Stack neatly and tie firmly in a cross pattern (+) using biodegradable paper string.",
                "4. Avoid putting out on heavy rain days to prevent soggy pulp."
            ]
        )

    # Default: Direct bag placement
    return PreparationPrescription(
        action_type=PreparationActionType.NONE,
        action_label="Direct Bag Placement",
        action_label_jp="そのまま指定袋へ",
        badge_color="slate",
        steps=[
            "1. Place item inside transparent or semitransparent municipal disposal bag.",
            "2. Tie bag securely at the top."
        ]
    )
