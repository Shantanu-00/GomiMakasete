"""
AWS Bedrock Daily Hard Budget Guard.
Enforces a strict $5.00/day spending limit across all Bedrock model invocations.
Prevents runaway billing and model exhaustion on public deployments.
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, Any, Tuple
from src.shared.logger import get_logger

logger = get_logger("budget_guard")

# Maximum daily budget in USD
DAILY_BUDGET_LIMIT_USD = float(os.getenv("DAILY_BEDROCK_BUDGET_USD", "5.00"))

# In AWS Lambda execution environment, only /tmp is writable
if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"):
    BUDGET_FILE_PATH = "/tmp/budget_tracker.json"
else:
    BUDGET_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/budget_tracker.json"))

# Official Bedrock Pricing per 1,000 tokens / image (USD)
MODEL_PRICING = {
    # Amazon Nova 2 Lite: ~$0.00006 / 1K in, ~$0.00024 / 1K out, ~$0.00004 / image
    "amazon.nova-lite-v1:0": {
        "input_per_1k": 0.00006,
        "output_per_1k": 0.00024,
        "image_fixed": 0.00004
    },
    "us.amazon.nova-lite-v1:0": {
        "input_per_1k": 0.00006,
        "output_per_1k": 0.00024,
        "image_fixed": 0.00004
    },
    # Amazon Nova Pro: ~$0.0008 / 1K in, ~$0.0032 / 1K out, ~$0.0008 / image
    "amazon.nova-pro-v1:0": {
        "input_per_1k": 0.0008,
        "output_per_1k": 0.0032,
        "image_fixed": 0.0008
    },
    "us.amazon.nova-pro-v1:0": {
        "input_per_1k": 0.0008,
        "output_per_1k": 0.0032,
        "image_fixed": 0.0008
    },
    # Amazon Nova Sonic: Voice / Multimodal Speech
    "amazon.nova-sonic-v1:0": {
        "input_per_1k": 0.0006,
        "output_per_1k": 0.0024,
        "image_fixed": 0.0000
    },
    "us.amazon.nova-sonic-v1:0": {
        "input_per_1k": 0.0006,
        "output_per_1k": 0.0024,
        "image_fixed": 0.0000
    }
}

class DailyBudgetGuard:
    def __init__(self):
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        os.makedirs(os.path.dirname(BUDGET_FILE_PATH), exist_ok=True)
        if not os.path.exists(BUDGET_FILE_PATH):
            with open(BUDGET_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def _get_today_key(self) -> str:
        return datetime.utcnow().strftime("%Y-%m-%d")

    def get_budget_status(self) -> Dict[str, Any]:
        """Returns structured daily budget status for UI and monitoring."""
        self._ensure_file_exists()
        today = self._get_today_key()
        try:
            with open(BUDGET_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            today_data = data.get(today, {})
            spent = float(today_data.get("total_spent_usd", 0.0))
            invocations = int(today_data.get("total_invocations", 0))
            models = today_data.get("models", {})
        except Exception as e:
            logger.error(f"Error reading budget status: {e}")
            spent, invocations, models = 0.0, 0, {}

        remaining = max(0.0, round(DAILY_BUDGET_LIMIT_USD - spent, 4))
        return {
            "daily_limit_usd": DAILY_BUDGET_LIMIT_USD,
            "spent_today_usd": round(spent, 4),
            "remaining_usd": remaining,
            "is_circuit_breaker_tripped": spent >= DAILY_BUDGET_LIMIT_USD,
            "total_invocations_today": invocations,
            "models_breakdown": models
        }

    def get_daily_spend(self) -> float:
        """Returns total USD spent today."""
        return self.get_budget_status()["spent_today_usd"]

    def can_invoke(self, estimated_cost_usd: float = 0.01) -> Tuple[bool, float, float]:
        """
        Checks if an invocation is allowed within the $5.00 hard budget.
        Returns: (allowed, current_spent_usd, remaining_budget_usd)
        """
        current_spent = self.get_daily_spend()
        remaining = max(0.0, DAILY_BUDGET_LIMIT_USD - current_spent)

        if (current_spent + estimated_cost_usd) > DAILY_BUDGET_LIMIT_USD:
            logger.critical(
                f"CIRCUIT BREAKER: Daily Bedrock budget limit of ${DAILY_BUDGET_LIMIT_USD:.2f} reached! "
                f"Spent: ${current_spent:.4f}. Attempted: ${estimated_cost_usd:.4f}."
            )
            return False, current_spent, remaining

        return True, current_spent, remaining

    def record_usage(
        self,
        model_id: str,
        input_tokens: int = 500,
        output_tokens: int = 300,
        num_images: int = 1
    ) -> float:
        """
        Calculates exact invocation cost and records it into the persistent budget ledger.
        Returns the invocation cost in USD.
        """
        pricing = MODEL_PRICING.get(model_id, MODEL_PRICING["amazon.nova-lite-v1:0"])
        cost = (
            (input_tokens / 1000.0) * pricing["input_per_1k"]
            + (output_tokens / 1000.0) * pricing["output_per_1k"]
            + (num_images * pricing["image_fixed"])
        )

        today = self._get_today_key()
        try:
            with open(BUDGET_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {}

        if today not in data:
            data[today] = {
                "total_spent_usd": 0.0,
                "total_invocations": 0,
                "models": {}
            }

        data[today]["total_spent_usd"] = round(data[today]["total_spent_usd"] + cost, 6)
        data[today]["total_invocations"] += 1
        data[today]["models"][model_id] = round(
            data[today]["models"].get(model_id, 0.0) + cost, 6
        )

        try:
            with open(BUDGET_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info(
                f"Bedrock invocation cost: ${cost:.5f} ({model_id}). "
                f"Today's total: ${data[today]['total_spent_usd']:.4f} / ${DAILY_BUDGET_LIMIT_USD:.2f}"
            )
        except Exception as e:
            logger.error(f"Error updating budget tracker file: {e}")

        return cost

# Global Budget Guard Singleton
budget_guard = DailyBudgetGuard()
