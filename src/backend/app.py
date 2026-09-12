"""
Amazon Bedrock AgentCore Runtime Application.
Strictly implements the mandatory HTTP Contract:
  - GET /ping (Port 8080)
  - POST /invocations (Port 8080)
Conforms to linux/arm64 microVM execution specs.
"""
import os
import sys
import json
import time
import types
from typing import Dict, Any, Optional

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure both local repo root and AWS Lambda package roots are supported seamlessly
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)   # src/
_root_dir = os.path.dirname(_parent_dir)       # repo root/

for _p in [_root_dir, _parent_dir, _current_dir]:
    if _p and _p not in sys.path:
        sys.path.insert(0, _p)

# In Lambda runtime where CodeUri is src/, alias 'src' to _parent_dir so 'from src.xxx' always resolves
if "src" not in sys.modules:
    try:
        _src_mod = types.ModuleType("src")
        _src_mod.__path__ = [_parent_dir]
        sys.modules["src"] = _src_mod
    except Exception:
        pass

from src.shared.logger import get_logger
from src.shared.schemas import AgentInvocationRequest
from src.agent.orchestrator import orchestrator
from src.agent.tools.safeguard_tool import evaluate_safeguard_intent
from src.agent.tools.action_decomposition_tool import prescribe_preparation_action
from src.agent.vision_client import vision_client
from src.backend.budget_guard import budget_guard
from src.backend.security import enforce_security_and_rate_limit

logger = get_logger("backend_app")

app = FastAPI(
    title="GomiMakasete Bedrock AgentCore Service",
    description="Autonomous Japanese Municipal Waste Agent powered by Strands Agents SDK",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AGENTCORE MANDATORY CONTRACT ENDPOINTS ---

@app.get("/ping")
async def ping():
    """AgentCore lifecycle monitor health check."""
    return {
        "status": "healthy",
        "service": "GomiMakasete-AgentCore",
        "timestamp": int(time.time()),
        "architecture": "linux/arm64",
        "model_fleet": "Amazon Nova 2 Lite / Claude 3.7 Sonnet (Sonnet 5)",
        "budget_limit_daily_usd": 5.00
    }

@app.get("/budget")
async def budget():
    """Returns real-time Bedrock daily budget status and circuit breaker health."""
    return budget_guard.get_budget_status()

@app.post("/invocations")
async def invocations(request: Request):
    """
    Main invocation endpoint mandated by Amazon Bedrock AgentCore Runtime.
    Receives JSON or raw binary bytes from AWS SDK or frontend client.
    """
    try:
        body_bytes = await request.body()
        if not body_bytes:
            raise HTTPException(status_code=400, detail="Empty request payload")

        # Enforce IP rate limit, payload size (<5MB), and optional shared secret
        enforce_security_and_rate_limit(request, body_bytes)

        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed JSON payload")

        input_data = payload.get("input", payload)
        action = input_data.get("action", "chat")

        # ACTION 1: MULTI-MODAL VISION DETECTION
        if action == "detect" or "image_base64" in input_data:
            preset = input_data.get("preset", "messy_desk")
            force_tier2 = bool(input_data.get("force_tier2", False))
            image_b64 = input_data.get("image_base64")

            result = vision_client.analyze_scene(
                image_base64=image_b64,
                preset=preset,
                force_tier2=force_tier2
            )
            return {"output": result}

        # ACTION 2: BATCH EVALUATION
        elif action == "evaluate" or "items" in input_data:
            items = input_data.get("items", [])
            neighborhood = input_data.get("neighborhood", "愛住町")
            banchi = input_data.get("banchi", "")
            municipality = input_data.get("municipality", "tokyo_shinjuku")

            res = orchestrator.evaluate_batch(
                items=items,
                neighborhood=neighborhood,
                banchi=banchi,
                municipality=municipality
            )
            return {"output": res}

        # ACTION 3: CONVERSATIONAL CHAT
        else:
            prompt = input_data.get("prompt") or payload.get("prompt", "Hello")
            session_id = input_data.get("session_id", "default-session")
            context = {
                "neighborhood": input_data.get("neighborhood", "愛住町"),
                "municipality": input_data.get("municipality", "tokyo_shinjuku")
            }
            reply = orchestrator.chat_interact(prompt, session_id=session_id, context=context)
            return {"output": {"message": reply}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invocation error: {e}")
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json"
        )

# Mangum Lambda Handler for AWS SAM Serverless Deployment
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    handler = None

if __name__ == "__main__":
    import uvicorn
    # AgentCore HTTP contract requires port 8080 on 0.0.0.0
    uvicorn.run(app, host="0.0.0.0", port=8080)
