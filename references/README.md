# Strands Agents SDK & AWS Bedrock AgentCore — Comprehensive Reference Manual

> **Official & Factual Reference Archive**  
> Curated and formatted for **GomiMakasete** hackathon developers and any future pair-programming AI sessions.  
> This directory is listed in `.gitignore` to keep git history clean while serving as an instant local reference.

---

## 🧭 Taxonomy & Directory Structure

```text
references/
├── README.md                                       # This Master Index & Quick Guide
│
├── strands-sdk/                                    # Strands Agents SDK (Python & TypeScript)
│   ├── 01-overview-and-architecture.md             # Core philosophy, ReAct loop, model support, DNA analogy
│   ├── 02-python-sdk-quickstart.md                 # Python SDK: Agent, @tool, strands_tools, streaming, traces
│   ├── 03-typescript-sdk-quickstart.md             # TS SDK: Agent, tool with Zod, vended tools, streaming
│   ├── 04-multi-agent-patterns.md                  # Agents-as-Tools, Swarms (Mesh), Graphs & Workflows
│   └── 05-observability-and-evaluation.md          # OTEL, ADOT, CloudWatch Application Signals, Strands Evals SDK
│
├── bedrock-agentcore/                              # Amazon Bedrock AgentCore
│   ├── 01-overview-and-core-services.md            # Platform overview: Runtime, Harness, Memory, Gateway, Identity
│   ├── 02-agentcore-cli-reference.md               # @aws/agentcore CLI: create, dev, deploy, invoke commands & flags
│   ├── 03-runtime-service-contracts.md             # HTTP contract (/invocations POST, /ping GET), binary payload, MCP, A2A
│   ├── 04-agentcore-memory-guide.md                # Short-term (events/sessions) & Long-term (Semantic, User Pref, Summary)
│   └── 05-agentcore-harness-guide.md               # Config-driven managed harness, microVM sandboxes, filesystem & shell
│
└── deployment-and-integration/                     # Bridging Strands & AgentCore
    ├── 01-deploy-strands-to-agentcore-python.md     # BedrockAgentCoreApp SDK wrapper & custom FastAPI ARM64 Docker
    ├── 02-deploy-strands-to-agentcore-typescript.md # Express TypeScript ARM64 Docker + raw body handler
    └── 03-end-to-end-cheat-sheet.md                 # Ready-to-copy code snippets for hackathon sprint
```

---

## ⚡ 60-Second Crash Course: What is New & What to Use

| Concept | Key Facts | Official Implementation |
| :--- | :--- | :--- |
| **Strands Agents SDK** | Open-source (Apache-2.0), model-driven SDK created by the AWS Amazon Q Developer team. Runs inside your process (not a platform). Default model: Bedrock Claude Sonnet 4 / 4.6. Supports Bedrock, OpenAI, Anthropic, Gemini, Ollama, LiteLLM. | `pip install strands-agents strands-agents-tools`<br>`npm install @strands-agents/sdk` |
| **AgentCore CLI** | Modern npm-based CLI `@aws/agentcore` (replaces legacy `bedrock-agentcore-starter-toolkit` pip package). Scaffolds, tests locally (`dev`), and deploys (`deploy`) directly to AWS. | `npm install -g @aws/agentcore`<br>`agentcore create` |
| **AgentCore Runtime** | Serverless microVM execution environment for custom code agents. Mandatory HTTP contract: `POST /invocations` (port 8080) and `GET /ping`. Target architecture: `linux/arm64`. | Python: `BedrockAgentCoreApp`<br>or FastAPI / Express |
| **AgentCore Harness** | Fully managed, config-based agent loop. Zero orchestration code needed. MicroVM sandbox with persistent filesystem, shell, and dynamic multi-model swapping mid-session. | `agentcore create --defaults` |
| **AgentCore Memory** | Managed memory layer. Short-term maintains conversation context (sessions & events). Long-term extracts persistent knowledge using strategies: Semantic, User Preference, Summary, Episodic. | Integrates with Strands & Bedrock SDK |
| **Observability** | Native OpenTelemetry (OTEL) integration with AWS Distro for OpenTelemetry (ADOT) and CloudWatch Application Signals. Every invocation outputs an `AgentResult` with full cycle traces and token metrics. | `pip install aws-opentelemetry-distro`<br>`opentelemetry-instrument python ...` |

---

## 🚀 Hackathon Quick-Start Paths

### Path 1: Python Strands Agent with AgentCore CLI
```bash
# 1. Install CLI
npm install -g @aws/agentcore

# 2. Scaffold Strands project
agentcore create --project-name GomiMakasete --name GomiAgent --language Python --framework Strands --model-provider Bedrock --build CodeZip

# 3. Local test
cd GomiMakasete
agentcore dev

# 4. Deploy to Bedrock AgentCore
agentcore deploy

# 5. Invoke
agentcore invoke
```

### Path 2: Standalone Python Strands Script
```python
from strands import Agent, tool
from strands_tools import calculator, current_time

@tool
def custom_action(query: str) -> str:
    """Action docstring is used by LLM for tool selection."""
    return f"Processed: {query}"

agent = Agent(tools=[calculator, current_time, custom_action])
response = agent("What is the current time?")
print(response.message)
```

---

*Refer to the individual markdown files in this directory for exhaustive API signatures, Dockerfile configurations, multi-agent mesh/supervisor patterns, and memory integration code.*
