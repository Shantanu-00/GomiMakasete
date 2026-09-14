"""
Strands Agents SDK Orchestrator.
Autonomous Supervisor Agent coordinating verified tools, memory, and confidence escalation.
"""
import json
from typing import Dict, Any, List, Optional
from src.shared.logger import get_logger
from src.shared.schemas import (
    DetectedItem,
    EvaluatedItem,
    VisionScanResult,
    IntentCategory
)
from src.agent.prompts.system_prompt import GOMI_SUPERVISOR_SYSTEM_PROMPT
from src.agent.tools.safeguard_tool import evaluate_safeguard_intent
from src.agent.tools.action_decomposition_tool import prescribe_preparation_action
from src.agent.tools.sodai_gomi_tool import evaluate_bulky_waste
from src.agent.tools.knowledge_base_tool import query_municipal_rules
from src.agent.tools.schedule_tool import lookup_neighborhood_schedule, resolve_item_schedule
from src.agent.memory.session_memory import memory_store

logger = get_logger("orchestrator")

try:
    from strands import Agent, tool
    STRANDS_ENABLED = True
except ImportError:
    STRANDS_ENABLED = False
    def tool(func):
        return func

# Decorated Strands Tools for ReAct Loop
@tool
def check_municipal_waste_rules(item_name: str, material: str = "", municipality: str = "tokyo_shinjuku") -> str:
    """Lookup official municipal sorting rules for household items."""
    res = query_municipal_rules(item_name, material, municipality)
    return json.dumps(res, ensure_ascii=False)

@tool
def lookup_collection_schedule(neighborhood: str, banchi: str = "", municipality: str = "tokyo_shinjuku") -> str:
    """Lookup hyper-local neighborhood collection days and next pickup dates."""
    res = lookup_neighborhood_schedule(neighborhood, banchi or None, municipality)
    return json.dumps(res, ensure_ascii=False)

@tool
def calculate_bulky_waste_fee(item_name: str, dimensions_cm: float = 0.0, municipality: str = "tokyo_shinjuku") -> str:
    """Check bulky waste (>30cm/50cm) fees, sticker requirements, and booking rules."""
    res = evaluate_bulky_waste(item_name, dimensions_cm, municipality)
    return json.dumps(res.model_dump(), ensure_ascii=False)

@tool
def prescribe_disposal_preparation(item_name: str, material: str = "") -> str:
    """Prescribe verified physical preparation steps (Separate, Rinse, Wrap Danger, Degas)."""
    res = prescribe_preparation_action(item_name, material)
    return json.dumps(res.model_dump(), ensure_ascii=False)

class GomiSupervisorOrchestrator:
    """Supervisor Agent coordinating the multi-step reasoning loop."""

    def __init__(self):
        if STRANDS_ENABLED:
            try:
                self.agent = Agent(
                    tools=[
                        check_municipal_waste_rules,
                        lookup_collection_schedule,
                        calculate_bulky_waste_fee,
                        prescribe_disposal_preparation
                    ],
                    system_prompt=GOMI_SUPERVISOR_SYSTEM_PROMPT
                )
                logger.info("Strands Agents SDK initialized with Amazon Nova.")
            except Exception as e:
                logger.warning(f"Strands Agent init deferred: {e}")
                self.agent = None
        else:
            self.agent = None

    def evaluate_batch(
        self,
        items: List[Dict[str, Any]],
        neighborhood: str = "愛住町",
        banchi: str = "",
        municipality: str = "tokyo_shinjuku"
    ) -> Dict[str, Any]:
        """Evaluates verified items through the deterministic tool chain."""
        schedule = lookup_neighborhood_schedule(neighborhood, banchi or None, municipality)
        evaluated_items: List[EvaluatedItem] = []

        for raw in items:
            name = raw.get("name", "Unknown Item")
            material = raw.get("material", "General")
            dim = float(raw.get("estimated_dim_cm", 0.0))

            # 1. Bulky Waste Calculation
            sodai_res = evaluate_bulky_waste(name, dim, municipality)

            # 2. Municipal Knowledge Base Rules
            rules_res = query_municipal_rules(name, material, municipality)

            # 3. Resolve item-specific pickup schedule from the neighborhood schedule
            item_sched_key = rules_res.get("schedule_key", "combustible")
            pickup_res = resolve_item_schedule(item_sched_key, schedule.get("schedules", {}))

            evaluated_items.append(EvaluatedItem(
                id=raw.get("id", name),
                name=name,
                material=material,
                dimensions_cm=dim,
                is_sodai_gomi=sodai_res.is_sodai_gomi,
                sodai_details=sodai_res if sodai_res.is_sodai_gomi else None,
                classification=rules_res["category"],
                classification_jp=rules_res["category_jp"],
                disposal_rules=rules_res["disposal_rules"],
                requires_disassembly=rules_res["requires_disassembly"],
                disassembly_notes=rules_res["disassembly_notes"],
                schedule_key=item_sched_key,
                pickup_day=pickup_res.get("pickup_day"),
                next_pickup_date=pickup_res.get("next_pickup_date"),
                bag_rule=rules_res.get("bag_rule"),
                special_warning=rules_res.get("special_warning")
            ))

        return {
            "municipality": municipality,
            "neighborhood": schedule.get("town", neighborhood),
            "sanitation_office": schedule.get("sanitation_office", "East Shinjuku"),
            "schedules": schedule.get("schedules", {}),
            "items": [item.model_dump() for item in evaluated_items]
        }

    def chat_interact(self, prompt: str, session_id: str = "default-session", context: Optional[Dict[str, Any]] = None) -> str:
        """Handles conversational resident queries."""
        ctx = context or {}
        memory_store.save_turn(session_id, "user", prompt)

        if self.agent:
            try:
                result = self.agent(prompt)
                reply = str(result.message)
                memory_store.save_turn(session_id, "assistant", reply)
                return reply
            except Exception as e:
                logger.warning(f"Strands execution failed, falling back: {e}")

        # Rich deterministic conversational response when agent isn't available
        neigh = ctx.get("neighborhood", "愛住町")
        muni = ctx.get("municipality", "tokyo_shinjuku")
        lower_q = prompt.lower()

        if any(g in lower_q for g in ["hello", "hi", "hey", "konnichiwa", "who are you", "help"]):
            reply = (
                f"Konnichiwa! I am Gomi-chan (ゴミちゃん), your autonomous recycling assistant for {muni}. "
                f"I can help you sort items, look up collection schedules for {neigh}, "
                "calculate bulky waste fees, and safely handle hazardous items like spray cans and batteries. "
                "What item would you like to check today?"
            )
        elif any(w in lower_q for w in ["when", "schedule", "day", "calendar", "tomorrow", "time"]):
            sched = lookup_neighborhood_schedule(neigh, ctx.get("banchi"), muni)
            burn = sched["schedules"]["burnable"]
            recyclable = sched["schedules"]["recyclable"]
            unburnable = sched["schedules"]["unburnable"]
            reply = (
                f"In {sched['town']}, collection days are:\n"
                f"• Burnable (燃やすごみ): {burn['days']} (Next: {burn['next']['next_date']} before 8:00 AM)\n"
                f"• Recyclables (資源): {recyclable['days']} (Next: {recyclable['next']['next_date']})\n"
                f"• Incombustibles (不燃・金属): {unburnable['days']} (Next: {unburnable['next']['next_date']})\n"
                "Remember: Always put garbage out before 8:00 AM under yellow crow nets. Never put it out the night before!"
            )
        elif any(b in lower_q for b in ["mattress", "futon", "sofa", "desk", "chair", "table", "bicycle", "microwave", "bulky", "sodai"]):
            bulky_res = evaluate_bulky_waste(prompt, municipality=muni)
            if bulky_res.get("is_sodai_gomi"):
                fee = bulky_res.get("fee_yen", 400)
                stickers = bulky_res.get("sticker_breakdown", {})
                reply = (
                    f"🛋️ Bulky Waste (粗大ごみ) for {bulky_res.get('item_name', 'item')}:\n"
                    f"• Standard Fee: ¥{fee}\n"
                    f"• Required Stickers: Ticket A (¥200) × {stickers.get('ticket_a', 0)}, Ticket B (¥300) × {stickers.get('ticket_b', 0)}\n"
                    "• Procedure: 1. Apply at the Municipal Bulky Waste Center. 2. Buy stickers at convenience stores. 3. Affix stickers and place outside by 8:00 AM on collection date."
                )
            else:
                reply = (
                    "In Japan, items exceeding 30 cm on any side are classified as Bulky Waste (粗大ごみ). "
                    "Apply to the local ward Bulky Waste Reception Center and purchase Ticket A/B stickers at convenience stores."
                )
        elif any(h in lower_q for h in ["battery", "lithium", "power bank"]):
            reply = (
                "🚨 FIRE HAZARD: Lithium-ion batteries and power banks must NEVER go in curbside bins! "
                "Under hydraulic pressure in collection trucks, they explode. Drop them in yellow JBRC recycling boxes at Yodobashi Camera or Bic Camera."
            )
        elif any(s in lower_q for s in ["spray", "gas can", "cassette"]):
            reply = (
                "In Shinjuku & Tokyo, DO NOT puncture spray cans! Exhaust all remaining gas outdoors in a breezy open spot until the hissing stops completely. "
                "Place in a clear transparent bag labeled 'スプレー缶' on resource day."
            )
        elif any(o in lower_q for o in ["oil", "tempura"]):
            reply = (
                "Never pour cooking oil down the drain! Solidify it using oil hardener powder (katameru-ten) or soak into paper towels inside a milk carton, "
                "and dispose with Combustible Waste (燃やすごみ)."
            )
        else:
            rules = query_municipal_rules(prompt, municipality=muni)
            cat = rules.get("category", "General Waste")
            cat_jp = rules.get("category_jp", "")
            disp = rules.get("disposal_rules", "Dispose according to municipal guidelines.")
            action = rules.get("preparation_action", "DISPOSE_DIRECT")
            reply = (
                f"🔍 Sorting guidance for \"{prompt}\" in {muni}:\n"
                f"• Category: {cat} ({cat_jp})\n"
                f"• Action: {action}\n"
                f"• Rules: {disp}"
            )

        memory_store.save_turn(session_id, "assistant", reply)
        return reply

# Global orchestrator singleton
orchestrator = GomiSupervisorOrchestrator()
