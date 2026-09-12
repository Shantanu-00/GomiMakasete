# Strands & AgentCore End-to-End Hackathon Cheat Sheet

> **Keep this open during hackathon coding sprints!**  
> Direct, production-ready snippets that avoid trial-and-error.

---

## 📋 1. Quick Copy: Strands Python Agent (Zero-Boilerplate)

```python
from strands import Agent, tool
from strands_tools import calculator, current_time

@tool
def sample_tool(param: str) -> str:
    """
    Clear docstring description here so the model knows when to choose this tool.

    Args:
        param (str): Explanation of input parameter
    """
    return f"Result for {param}"

agent = Agent(
    tools=[calculator, current_time, sample_tool],
    system_prompt="You are a helpful AI assistant."
)

result = agent("What is 1024 * 768?")
print(result.message)
```

---

## 📋 2. Quick Copy: AgentCore Runtime Python Wrapper

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent

app = BedrockAgentCoreApp()
agent = Agent()

@app.entrypoint
def invoke(payload: dict) -> dict:
    prompt = payload.get("prompt") or payload.get("input", {}).get("prompt", "")
    result = agent(prompt)
    return {"output": {"message": result.message}}

if __name__ == "__main__":
    app.run() # Listens on port 8080 with /ping and /invocations
```

---

## 📋 3. Quick Copy: Multi-Agent Supervisor Pattern

```python
from strands import Agent, tool

# 1. Specialist Agent
specialist = Agent(system_prompt="Specialist focused strictly on legal and municipal rules.")

@tool
def consult_specialist(query: str) -> str:
    """Consult the legal and municipal compliance specialist."""
    return str(specialist(query).message)

# 2. Orchestrator
orchestrator = Agent(
    system_prompt="You are the lead coordinator. Use consult_specialist when regulatory rules apply.",
    tools=[consult_specialist]
)

response = orchestrator("Can I leave bulky waste on the curb without paying?")
print(response.message)
```

---

## 📋 4. Quick Copy: AgentCore CLI Workflow

```bash
# 1. Install CLI
npm install -g @aws/agentcore

# 2. Scaffold new project
agentcore create \
  --project-name GomiMakasete \
  --name GomiAgent \
  --language Python \
  --framework Strands \
  --model-provider Bedrock \
  --memory shortTerm \
  --build CodeZip

# 3. Local test server (emulates AgentCore Runtime on http://localhost:8080)
cd GomiMakasete
agentcore dev

# 4. Deploy to AWS
agentcore deploy

# 5. Invoke deployed agent
agentcore invoke --payload '{"prompt": "Hello!"}'
```

---

## 📋 5. Quick Copy: Invoking via Boto3 (Python)

```python
import boto3
import json

client = boto3.client('bedrock-agentcore', region_name='us-west-2')

payload = json.dumps({"prompt": "Can you help me sort garbage?"}).encode('utf-8')

response = client.invoke_agent_runtime(
    agentRuntimeArn="<YOUR_AGENT_RUNTIME_ARN>",
    runtimeSessionId="session-id-must-be-at-least-33-characters-long",
    payload=payload,
    qualifier="DEFAULT"
)

body = json.loads(response['response'].read())
print(body)
```

---

## ⚠️ 6. Top 5 Gotchas & Fixes

| # | Gotcha | Cause & Resolution |
| :- | :--- | :--- |
| **1** | `agentcore --version` crashes on Windows | **Old pip toolkit shadowing npm CLI**. Run `pip uninstall bedrock-agentcore-starter-toolkit` and restart your shell. |
| **2** | Container deployment fails on AgentCore | **Wrong CPU architecture**. AgentCore requires `linux/arm64`. Build using `docker buildx build --platform linux/arm64 ...`. |
| **3** | `ValidationException: runtimeSessionId` | `runtimeSessionId` passed to `invoke_agent_runtime` must be **at least 33 characters long**. Use a UUID or timestamp string + suffix. |
| **4** | Bedrock `AccessDeniedException` | Model access is not enabled in AWS Bedrock. Open the Bedrock AWS Console > **Model access** > Request access for Claude Sonnet 4 / Nova. |
| **5** | Port 8080 binding error | Container / app must listen on `0.0.0.0:8080`, not `127.0.0.1:8080` or port `3000`/`5000`. |
