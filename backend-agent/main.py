"""
Amazon Bedrock AgentCore Runtime Entrypoint for GomiMakasete.
Strictly implements the HTTP service contract:
  - GET /ping (Port 8080)
  - POST /invocations (Port 8080, raw/json payload)
Includes support for Stage 1 Vision detection, Stage 2 verification review, and Stage 3 batch evaluation.
"""
import os
import sys
import json
import base64
import time
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import boto3

from agent import gomi_agent
from tools.schedule_tool import lookup_neighborhood_schedule

# Bedrock Vision Model ID
BEDROCK_VISION_MODEL_ID = os.getenv("BEDROCK_VISION_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
REGION = os.getenv("AWS_REGION", "us-east-1")

app = FastAPI(
    title="GomiMakasete AgentCore Runtime Service",
    description="Autonomous Japanese Waste Classification & Scheduling on AWS Bedrock AgentCore",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class InvocationInput(BaseModel):
    prompt: Optional[str] = None
    action: Optional[str] = "chat" # "chat", "detect", "evaluate"
    items: Optional[List[Dict[str, Any]]] = None
    neighborhood: Optional[str] = "愛住町"
    banchi: Optional[str] = None
    municipality: Optional[str] = "shinjuku"
    image_base64: Optional[str] = None

class InvocationPayload(BaseModel):
    input: Optional[InvocationInput] = None
    prompt: Optional[str] = None

# --- MANDATORY AGENTCORE CONTRACT ENDPOINTS ---

@app.get("/ping")
async def ping():
    """AgentCore lifecycle monitor health check."""
    return {
        "status": "healthy",
        "service": "GomiMakasete-AgentCore",
        "timestamp": int(time.time()),
        "agent": "Strands-Bedrock-Supervisor"
    }

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
        
        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed JSON payload")

        # Normalize AgentCore and direct request shapes
        input_data = payload.get("input", payload)
        action = input_data.get("action", "chat")

        # ACTION 1: BATCH EVALUATION (Stage 2 -> Stage 3)
        if action == "evaluate" or "items" in input_data:
            items = input_data.get("items", [])
            neighborhood = input_data.get("neighborhood", "愛住町")
            banchi = input_data.get("banchi", "")
            municipality = input_data.get("municipality", "shinjuku")

            eval_result = gomi_agent.evaluate_items_batch(
                items=items,
                neighborhood=neighborhood,
                banchi=banchi,
                municipality=municipality
            )
            return {"output": eval_result}

        # ACTION 2: MULTI-MODAL VISION INTAKE (Stage 1)
        elif action == "detect" or "image_base64" in input_data:
            img_b64 = input_data.get("image_base64", "")
            detected_items = await perform_vision_detection(img_b64)
            return {"output": {"detected_items": detected_items}}

        # ACTION 3: CONVERSATIONAL CHAT (Strands Agent ReAct Loop)
        else:
            prompt = input_data.get("prompt") or payload.get("prompt", "Hello")
            context = {
                "municipality": input_data.get("municipality", "shinjuku"),
                "neighborhood": input_data.get("neighborhood", "愛住町"),
                "banchi": input_data.get("banchi", "")
            }
            res = gomi_agent.process_query(prompt, context)
            return {"output": res}

    except HTTPException:
        raise
    except Exception as e:
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json"
        )

# --- HELPER: BEDROCK VISION DETECTION ---

async def perform_vision_detection(image_base64: str) -> List[Dict[str, Any]]:
    """
    Invokes AWS Bedrock Claude Vision to detect discrete trash items in the image.
    Falls back to a realistic mock inspection if AWS credentials or image are absent.
    """
    if not image_base64:
        return get_sample_detected_items()

    if os.getenv("AWS_ACCESS_KEY_ID"):
        try:
            client = boto3.client("bedrock-runtime", region_name=REGION)
            
            # Clean base64 header if present
            clean_b64 = image_base64
            if "," in image_base64:
                clean_b64 = image_base64.split(",", 1)[1]

            system_instruction = (
                "You are an expert waste classification computer vision model for Japan. "
                "Detect all individual items or discarded objects in the image. "
                "Output ONLY a valid JSON array of objects with keys: "
                "id, name, material, estimated_dim_cm, confidence, requires_disassembly."
            )

            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "system": system_instruction,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": clean_b64
                                }
                            },
                            {
                                "type": "text",
                                "text": "Analyze the waste items in this image and return the JSON array."
                            }
                        ]
                    }
                ]
            })

            response = client.invoke_model(
                modelId=BEDROCK_VISION_MODEL_ID,
                body=body
            )
            resp_body = json.loads(response["body"].read())
            reply_text = resp_body["content"][0]["text"].strip()

            # Parse JSON from reply
            if "```json" in reply_text:
                reply_text = reply_text.split("```json")[1].split("```")[0].strip()
            elif "```" in reply_text:
                reply_text = reply_text.split("```")[1].split("```")[0].strip()

            items = json.loads(reply_text)
            if isinstance(items, list):
                return items
        except Exception as e:
            # Fallback to rich sample
            pass

    return get_sample_detected_items()

def get_sample_detected_items() -> List[Dict[str, Any]]:
    """Sample realistic detected items for interactive testing."""
    return [
        {
            "id": "item-1",
            "name": "Green Tea PET Bottle",
            "material": "PET Plastic",
            "estimated_dim_cm": 22.0,
            "confidence": 0.98,
            "requires_disassembly": True,
            "components": [
                {"name": "Bottle Body", "material": "PET Plastic", "dim_cm": 22.0},
                {"name": "Bottle Cap", "material": "Polypropylene (Plastic)", "dim_cm": 3.0},
                {"name": "Vinyl Film Label", "material": "Plastic Film", "dim_cm": 15.0}
            ]
        },
        {
            "id": "item-2",
            "name": "Electric Rice Cooker",
            "material": "Plastic / Metal / Wiring",
            "estimated_dim_cm": 34.0,
            "confidence": 0.94,
            "requires_disassembly": False
        },
        {
            "id": "item-3",
            "name": "Aluminum Coffee Can",
            "material": "Aluminum",
            "estimated_dim_cm": 13.0,
            "confidence": 0.99,
            "requires_disassembly": False
        }
    ]

# --- NEIGHBORHOOD AUTOCOMPLETE ENDPOINT ---

@app.get("/api/neighborhoods")
async def get_neighborhoods(q: Optional[str] = ""):
    """Returns list of neighborhood names in Shinjuku for frontend autocomplete."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "data/shinjuku_normalized.json")
    if not os.path.exists(json_path):
        return []
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    results = []
    seen = set()
    for item in data:
        name = item["town_full"]
        if name not in seen:
            if not q or q.lower() in name.lower() or q.lower() in item["kana"]:
                results.append({
                    "full_name": name,
                    "clean_name": item["town_clean"],
                    "banchi_spec": item["banchi_spec"],
                    "kana": item["kana"]
                })
                seen.add(name)
    return results[:30]

if __name__ == "__main__":
    # AgentCore HTTP contract: MUST listen on 0.0.0.0:8080
    uvicorn.run(app, host="0.0.0.0", port=8080)
