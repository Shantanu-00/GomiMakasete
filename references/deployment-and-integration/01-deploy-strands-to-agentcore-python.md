# Deploying Strands Agent to Amazon Bedrock AgentCore Runtime (Python)

> **Source**: strandsagents.com (`deploy_to_bedrock_agentcore/python/`)

---

## Overview

Amazon Bedrock AgentCore Runtime provides a serverless, secure microVM execution environment for custom code agents. This guide details both deployment options for Python Strands agents:
1. **Option A (SDK Integration)**: Using the official `BedrockAgentCoreApp` wrapper (Fastest, automatic HTTP contract).
2. **Option B (Custom FastAPI)**: Full control over routes, middleware, and container packaging.

---

## Option A: SDK Integration with `BedrockAgentCoreApp` (Recommended)

### Step 1: Install Dependencies
```bash
pip install strands-agents strands-agents-tools bedrock-agentcore
```

### Step 2: Write Agent Entrypoint (`main.py`)
```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands_tools import calculator, current_time

# 1. Initialize BedrockAgentCoreApp and Strands Agent
app = BedrockAgentCoreApp()

@tool
def check_pickup_schedule(ward: str, category: str) -> str:
    """Lookup Tokyo ward trash pickup day."""
    return f"{ward} collects {category} on Tuesdays and Fridays at 8:00 AM."

agent = Agent(
    tools=[calculator, current_time, check_pickup_schedule],
    system_prompt="You are GomiMakasete, expert assistant for Japanese municipal garbage management."
)

# 2. Define the Entrypoint
@app.entrypoint
def invoke(payload: dict) -> dict:
    """
    Receives incoming payload from Bedrock AgentCore Runtime.
    Expected payload format: {"prompt": "User query here"} or {"input": {"prompt": "..."}}
    """
    prompt = payload.get("prompt") or payload.get("input", {}).get("prompt", "Hello")
    result = agent(prompt)
    return {
        "output": {
            "message": result.message
        }
    }

# 3. Start the Server
if __name__ == "__main__":
    app.run()
```

### Step 3: Streaming Variant (`streaming_agent.py`)
```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent

app = BedrockAgentCoreApp()
agent = Agent(callback_handler=None)

@app.entrypoint
async def agent_invocation(payload: dict):
    prompt = payload.get("prompt", "Hello")
    stream = agent.stream_async(prompt)
    async for event in stream:
        if "data" in event:
            yield event["data"]

if __name__ == "__main__":
    app.run()
```

---

## Option B: Custom FastAPI Implementation

Use this when you need custom health metrics, logging middleware, or authentication filters.

### `agent.py`:
```python
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime, timezone
from strands import Agent

app = FastAPI(title="GomiMakasete Agent Server", version="1.0.0")
strands_agent = Agent()

class InvocationRequest(BaseModel):
    input: Dict[str, Any]

class InvocationResponse(BaseModel):
    output: Dict[str, Any]

# MANDATORY: /ping health check
@app.get("/ping")
async def ping():
    return {"status": "healthy"}

# MANDATORY: /invocations POST endpoint
@app.post("/invocations", response_model=InvocationResponse)
async def invoke_agent(request: InvocationRequest):
    user_prompt = request.input.get("prompt", "")
    if not user_prompt:
        raise HTTPException(status_code=400, detail="Missing 'prompt' field in input.")

    result = strands_agent(user_prompt)

    return InvocationResponse(
        output={
            "message": result.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": "strands-claude"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

### `Dockerfile` (Must be `linux/arm64`):
```dockerfile
FROM --platform=linux/arm64 ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

# Install dependencies using uv
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-cache

COPY agent.py ./

EXPOSE 8080

CMD ["uv", "run", "uvicorn", "agent:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## Deploying to AgentCore Runtime

### Method 1: Using the AgentCore CLI (Fastest)
```bash
# If using CodeZip (no Docker needed):
agentcore deploy

# Test deployment:
agentcore invoke --payload '{"prompt": "How do I throw away fluorescent lightbulbs?"}'
```

### Method 2: Invoking Deployed Agent via Boto3
```python
import boto3
import json

client = boto3.client('bedrock-agentcore', region_name='us-west-2')

payload = json.dumps({
    "input": {
        "prompt": "How do I throw away fluorescent lightbulbs?"
    }
}).encode('utf-8')

response = client.invoke_agent_runtime(
    agentRuntimeArn="arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/gomi-agent-xyz",
    runtimeSessionId="session-unique-string-minimum-33-chars-long", # Must be >= 33 chars
    payload=payload,
    qualifier="DEFAULT"
)

response_body = response['response'].read()
result = json.loads(response_body)
print("Agent Reply:", result)
```
