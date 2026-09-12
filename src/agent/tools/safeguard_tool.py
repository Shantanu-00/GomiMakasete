"""
Safeguard Tool: Intent Classification & Accidental Valuable Protection.
Prevents user panic by isolating active personal devices and assets from trash processing.
"""
import re
from typing import Dict, Any, Tuple
from src.shared.schemas import IntentCategory

SAFEGUARD_DEFINITIONS = [
    (re.compile(r"phone|iphone|android|smartphone|pixel|galaxy", re.I), "Smartphone", "High-value personal cellular device"),
    (re.compile(r"laptop|macbook|thinkpad|notebook pc", re.I), "Laptop Computer", "High-value computing asset"),
    (re.compile(r"key|car key|house key|keychain", re.I), "Personal Keys", "Critical household & vehicle access credentials"),
    (re.compile(r"wallet|purse|credit card|cash|yen notes", re.I), "Wallet / Currency", "Financial & identity credentials"),
    (re.compile(r"watch|apple watch|rolex|smartwatch", re.I), "Wristwatch", "Personal accessory & jewelry"),
    (re.compile(r"ring|necklace|jewelry|earring", re.I), "Jewelry", "Precious personal ornament"),
    (re.compile(r"passport|id card|driver license|my number", re.I), "Official ID / Passport", "Sensitive government credential")
]

def evaluate_safeguard_intent(item_name: str) -> Tuple[IntentCategory, str]:
    """
    Evaluates an item name to determine if it is an accidental valuable safeguard or trash candidate.
    """
    for pattern, name, reason in SAFEGUARD_DEFINITIONS:
        if pattern.search(item_name):
            return IntentCategory.SAFEGUARD_NON_WASTE, reason
    return IntentCategory.DISCARD_CANDIDATE, ""
