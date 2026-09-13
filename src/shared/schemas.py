"""
Pydantic Schemas for GomiMakasete.
Shared contracts for items, actions, safeguards, and AgentCore payloads.
"""
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class IntentCategory(str, Enum):
    DISCARD_CANDIDATE = "DISCARD_CANDIDATE"
    SAFEGUARD_NON_WASTE = "SAFEGUARD_NON_WASTE"

class PreparationActionType(str, Enum):
    SEPARATE_PARTS = "SEPARATE_PARTS"
    RINSE_AND_DRY = "RINSE_AND_DRY"
    SAFE_WRAP_HAZARD = "SAFE_WRAP_HAZARD"
    OUTDOOR_DEGAS = "OUTDOOR_DEGAS"
    BUNDLE_CORD = "BUNDLE_CORD"
    NONE = "NONE"

class SeparableComponent(BaseModel):
    name: str
    material: str
    destination_stream: str
    dim_cm: Optional[float] = None

class PreparationPrescription(BaseModel):
    action_type: PreparationActionType
    action_label: str
    action_label_jp: str
    badge_color: str = "emerald"
    steps: List[str] = Field(default_factory=list)
    safety_warning: Optional[str] = None
    components: Optional[List[SeparableComponent]] = None

class DetectedItem(BaseModel):
    id: str
    name: str
    description: str = ""
    material: str = "General"
    estimated_dim_cm: float = 0.0
    confidence: float = 1.0
    model_tier: str = "Tier-1 (Nova 2 Lite)"
    is_low_confidence: bool = False
    intent_category: IntentCategory = IntentCategory.DISCARD_CANDIDATE
    is_marked_for_disposal: bool = True
    user_edited: bool = False
    preparation: Optional[PreparationPrescription] = None

class VisionScanResult(BaseModel):
    items: List[DetectedItem]
    overall_confidence: float
    model_used: str
    latency_ms: int
    safeguards_triggered: int
    needs_escalation: bool

class StickerBreakdown(BaseModel):
    sticker_a_count: int
    sticker_b_count: int
    total_stickers: int
    summary: str
    total_cost_yen: int

class SodaiDetails(BaseModel):
    is_sodai_gomi: bool
    is_restricted_appliance: bool
    official_catalog_name_jp: Optional[str] = None
    category: Optional[str] = None
    fee_yen: Optional[int] = None
    stickers: Optional[StickerBreakdown] = None
    booking_portal: Optional[str] = None
    phone_number: Optional[str] = None
    appointment_procedure: Optional[List[str]] = None
    headline: Optional[str] = None
    rules: Optional[str] = None

class EvaluatedItem(BaseModel):
    id: str
    name: str
    material: str
    dimensions_cm: float
    is_sodai_gomi: bool
    sodai_details: Optional[SodaiDetails] = None
    classification: str
    classification_jp: str
    disposal_rules: str
    requires_disassembly: bool = False
    disassembly_notes: Optional[str] = None
    schedule_key: Optional[str] = None
    pickup_day: Optional[str] = None
    next_pickup_date: Optional[str] = None
    bag_rule: Optional[str] = None
    special_warning: Optional[str] = None

class AgentInvocationRequest(BaseModel):
    action: str = "chat" # "chat", "detect", "evaluate"
    prompt: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    neighborhood: Optional[str] = "愛住町"
    banchi: Optional[str] = None
    municipality: Optional[str] = "shinjuku"
    image_base64: Optional[str] = None
    preset: Optional[str] = "messy_desk"
    force_tier2: bool = False
