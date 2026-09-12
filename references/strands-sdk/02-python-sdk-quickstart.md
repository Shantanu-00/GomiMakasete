# Strands Agents SDK: Python Developer Quickstart

> **Prerequisites**: Python 3.10+  
> **Packages**: `strands-agents`, `strands-agents-tools`

---

## 1. Installation

```bash
# 1. Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# 2. Install core Strands SDK and community tools
pip install strands-agents strands-agents-tools
```

---

## 2. Configuring AWS Credentials

By default, Strands uses Amazon Bedrock with Claude Sonnet 4 / 4.6. Ensure your AWS credentials have Bedrock model invocation permissions:

```bash
# Option A: Environment variables
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_SESSION_TOKEN="optional-session-token"
export AWS_DEFAULT_REGION="us-east-1" # or us-west-2

# Option B: AWS CLI profile
aws configure

# Option C: Bedrock API Key
export AWS_BEARER_TOKEN_BEDROCK="your-bedrock-api-token"
```

---

## 3. Creating Custom Tools with `@tool`

Strands inspects python functions decorated with `@tool`. Type hints and Google/Sphinx style docstrings are automatically converted into JSON schema parameters for the LLM.

```python
from strands import tool

@tool
def calculate_waste_disposal_fee(item_type: str, weight_kg: float) -> dict:
    """
    Calculate the disposal fee and recycling classification for discarded waste items.

    Args:
        item_type (str): Type of trash/item (e.g., 'furniture', 'electronics', 'appliance', 'plastic')
        weight_kg (float): Weight of the item in kilograms

    Returns:
        dict: Calculation details including fee (JPY), classification, and special instructions
    """
    base_rates = {
        "furniture": 500,
        "electronics": 1200,
        "appliance": 2000,
        "plastic": 0,
    }
    rate = base_rates.get(item_type.lower(), 300)
    total_fee = rate + int(weight_kg * 50)
    
    return {
        "item_type": item_type,
        "classification": "Sodai Gomi (Bulky Waste)" if weight_kg > 10 else "General Waste",
        "fee_yen": total_fee,
        "pickup_sticker_required": total_fee > 0
    }
```

---

## 4. Building and Invoking an Agent

```python
from strands import Agent
from strands_tools import calculator, current_time

# Initialize the agent with built-in community tools and custom tools
agent = Agent(
    tools=[calculator, current_time, calculate_waste_disposal_fee],
    system_prompt="You are GomiMakasete, an expert Japanese municipal waste management AI assistant. Help users categorize trash, calculate fees, and schedule pickups."
)

# 1. Synchronous Invocation
result = agent("I have an old wooden sofa weighing 35kg. How much does disposal cost in Tokyo, and what is today's date?")

# Access the response text
print("Agent Response:\n", result.message)

# Access execution metrics (tokens, cycles, tool usage stats)
print("\nExecution Metrics:\n", result.metrics.get_summary())
```

---

## 5. Streaming Responses (Async Iterator)

Ideal for web servers (FastAPI, Starlette, Django Channels) or responsive terminal streaming:

```python
import asyncio
from strands import Agent
from strands_tools import current_time

agent = Agent(
    tools=[current_time],
    callback_handler=None # Disable automatic console printing
)

async def stream_reply():
    prompt = "Tell me the current time and give 3 tips on sorting combustible garbage."
    
    async for event in agent.stream_async(prompt):
        # 1. Text token delta
        if "data" in event:
            print(event["data"], end="", flush=True)
            
        # 2. Tool invocation notification
        elif "current_tool_use" in event and event["current_tool_use"].get("name"):
            tool_name = event["current_tool_use"]["name"]
            print(f"\n[Invoking tool: {tool_name}]", flush=True)

if __name__ == "__main__":
    asyncio.run(stream_reply())
```

---

## 6. Configuring Models

### Method 1: String Model ID
```python
from strands import Agent

# Specify Bedrock model string directly
agent = Agent(model="global.anthropic.claude-sonnet-4-6")
```

### Method 2: Detailed `BedrockModel` Configuration
```python
from strands import Agent
from strands.models import BedrockModel

bedrock_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-6",
    region_name="us-west-2",
    temperature=0.2,
    max_tokens=2048,
)

agent = Agent(model=bedrock_model)
```

---

## 7. Observability & Debugging

```python
import logging
from strands import Agent

# Enable full debug logs for the strands library
logging.getLogger("strands").setLevel(logging.DEBUG)
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler()]
)

agent = Agent()
result = agent("Hello!")
```

### Inspected `AgentResult` Structure:
- `result.message`: Final assistant response string.
- `result.messages`: Full conversation message history including tool use & tool result blocks.
- `result.metrics.get_summary()`:
  - `accumulated_usage`: `{"inputTokens": N, "outputTokens": M, "totalTokens": ...}`
  - `tool_usage`: Per-tool call counts, errors, execution latency, and arguments.
  - `total_cycles`: Number of reasoning-tool loops executed.
  - `traces`: Hierarchical execution trace spans (Cycle 1, Tool execution, Cycle 2).
