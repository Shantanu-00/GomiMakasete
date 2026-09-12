"""
GomiMakasete Autonomous Waste Assistant.
Powered by Strands Agents SDK and Amazon Bedrock models.
Integrates Municipal RAG, Neighborhood Schedules, and Sodai Gomi Fee Calculators.
"""
import json
from typing import Dict, Any, List, Optional
from tools.knowledge_base_tool import query_municipal_knowledge_base
from tools.schedule_tool import lookup_neighborhood_schedule
from tools.sodai_gomi_tool import evaluate_sodai_gomi

# Try importing strands; provide robust fallback if strands-agents is not yet pip installed
try:
    from strands import Agent, tool
    STRANDS_AVAILABLE = True
except ImportError:
    STRANDS_AVAILABLE = False
    # Mock decorator for environments without strands package
    def tool(func):
        return func

SYSTEM_PROMPT = """You are GomiMakasete (ゴミ任せて), the premier AI municipal waste assistant for Japan.
Your mission is to provide authoritative, stress-free waste disposal and recycling guidance to residents and newcomers.

When helping a resident:
1. Examine their items carefully.
2. Determine if any item is Sodai Gomi (bulky waste, typically > 30 cm) or restricted under the Home Appliance Recycling Act.
3. For bulky waste, specify the exact Japanese catalog name, required sticker types (A券 ¥200 / B券 ¥300), total cost, and booking steps.
4. For recyclable items (e.g. PET bottles), instruct the resident on disassembly steps (cap off, label peeled, rinse, flatten).
5. Cross-reference the resident's neighborhood to specify their exact next pickup day and morning cutoff time (8:00 AM).
6. Always be polite, encouraging, and clear.
"""

# Define Strands Tools
@tool
def check_waste_rules(item_name: str, material: str = "", municipality: str = "shinjuku") -> str:
    """
    Look up municipal classification rules (Burnable, Non-burnable, Recyclable) for an item.

    Args:
        item_name: The name of the item (e.g., 'plastic bottle', 'frying pan')
        material: Primary material if known (e.g., 'plastic', 'metal')
        municipality: The ward or city (default: 'shinjuku')
    """
    res = query_municipal_knowledge_base(item_name, material, municipality)
    return json.dumps(res, ensure_ascii=False)

@tool
def get_pickup_schedule(neighborhood: str, banchi: str = "", municipality: str = "shinjuku") -> str:
    """
    Look up hyper-local neighborhood collection days and next pickup dates from DynamoDB.

    Args:
        neighborhood: Town name (e.g., '荒木町', '市谷台町', '愛住町')
        banchi: Optional block/house number for banchi-split areas (e.g., '22', '3')
        municipality: The ward or city (default: 'shinjuku')
    """
    res = lookup_neighborhood_schedule(neighborhood, banchi or None, municipality)
    return json.dumps(res, ensure_ascii=False)

@tool
def check_bulky_waste_sodai_gomi(item_name: str, dimensions_cm: float = 0.0, municipality: str = "shinjuku") -> str:
    """
    Calculate bulky waste (Sodai Gomi) fees, sticker counts (A券/B券), and booking procedures.

    Args:
        item_name: The discarded item name (e.g., 'microwave', 'bookshelf', 'air conditioner')
        dimensions_cm: Longest dimension in centimeters
        municipality: The ward or city (default: 'shinjuku')
    """
    res = evaluate_sodai_gomi(item_name, dimensions_cm, municipality)
    return json.dumps(res, ensure_ascii=False)

class GomiMakaseteAgent:
    """Orchestrator for GomiMakasete supporting Strands ReAct loop and deterministic fallback."""

    def __init__(self):
        if STRANDS_AVAILABLE:
            try:
                self.agent = Agent(
                    tools=[check_waste_rules, get_pickup_schedule, check_bulky_waste_sodai_gomi],
                    system_prompt=SYSTEM_PROMPT
                )
            except Exception:
                self.agent = None
        else:
            self.agent = None

    def process_query(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Runs the query through Strands Agent or structured multi-tool pipeline."""
        if self.agent:
            try:
                result = self.agent(query)
                return {"message": str(result.message)}
            except Exception as e:
                pass

        # Deterministic pipeline fallback
        return self._structured_pipeline(query, context or {})

    def evaluate_items_batch(
        self,
        items: List[Dict[str, Any]],
        neighborhood: str = "愛住町",
        banchi: str = "",
        municipality: str = "shinjuku"
    ) -> Dict[str, Any]:
        """
        Direct high-performance evaluation for Stage 2 confirmed items.
        Applies KB rules, Sodai Gomi calculations, and neighborhood schedule resolution.
        """
        evaluated_items = []
        schedule_info = lookup_neighborhood_schedule(neighborhood, banchi or None, municipality)

        for item in items:
            name = item.get("name", "Unknown Item")
            material = item.get("material", "")
            dim = float(item.get("estimated_dim_cm", 0.0))

            # 1. Check Bulky Waste first
            sodai_res = evaluate_sodai_gomi(name, dim, municipality)

            # 2. Check Standard Municipal Rules
            rules_res = query_municipal_knowledge_base(name, material, municipality)

            evaluated_items.append({
                "id": item.get("id", name),
                "name": name,
                "material": material,
                "dimensions_cm": dim,
                "is_sodai_gomi": sodai_res["is_sodai_gomi"],
                "sodai_details": sodai_res if sodai_res["is_sodai_gomi"] else None,
                "classification": rules_res["category"],
                "classification_jp": rules_res["category_jp"],
                "disposal_rules": rules_res["instructions"],
                "requires_disassembly": rules_res.get("requires_disassembly", False) or item.get("requires_disassembly", False),
                "disassembly_notes": rules_res.get("disassembly_notes", "")
            })

        return {
            "municipality": municipality,
            "neighborhood": schedule_info.get("town", neighborhood),
            "sanitation_office": schedule_info.get("sanitation_office", ""),
            "schedules": schedule_info.get("schedules", {}),
            "items": evaluated_items
        }

    def _structured_pipeline(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Provides instant intelligent synthesis for chat interactions."""
        muni = context.get("municipality", "shinjuku")
        neigh = context.get("neighborhood", "愛住町")
        
        # Simple keyword checks to invoke appropriate tool
        lower_q = query.lower()
        if "when" in lower_q or "day" in lower_q or "schedule" in lower_q or "calendar" in lower_q:
            sched = lookup_neighborhood_schedule(neigh, context.get("banchi"), muni)
            return {
                "message": (
                    f"In {sched['town']}, burnable trash is collected on {sched['schedules']['burnable']['days']} "
                    f"(next: {sched['schedules']['burnable']['next']['next_date']}). "
                    f"Recyclables are on {sched['schedules']['recyclable']['days']}, and "
                    f"non-burnables on {sched['schedules']['unburnable']['days']}. "
                    "Remember to put trash out before 8:00 AM!"
                )
            }
        
        # Default helpful response
        return {
            "message": (
                f"I am GomiMakasete. I can help you sort any household waste for {muni.title()}, "
                f"calculate bulky waste stickers, and look up your schedule for {neigh}. "
                "Upload a photo or ask any disposal question!"
            )
        }

# Global singleton
gomi_agent = GomiMakaseteAgent()
