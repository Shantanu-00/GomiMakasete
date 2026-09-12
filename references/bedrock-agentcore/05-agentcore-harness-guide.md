# Amazon Bedrock AgentCore: Managed Harness Deep Dive

> **Source**: AWS Official Documentation (`harness.md`, `harness-vs-runtime.md`)

---

## 1. What is the AgentCore Harness?

Every AI agent requires an **orchestration harness**: a loop that prompts the model, parses tool selection, executes tools, injects output, manages context, and enforces security boundaries.

Running that loop in production involves massive operational overhead: concurrency management, state persistence, session isolation, filesystem sandboxing, and identity propagation.

**AgentCore Harness** turns this entire stack into **declarative configuration**. Instead of writing and maintaining orchestration code, you declare:
- **Model**: Model provider & ID (e.g. Bedrock Claude 3.5 Sonnet, Nova Premier, OpenAI GPT-4o).
- **Instructions**: Persona and operational guardrails.
- **Tools**: Gateway MCP tools, Code Interpreter, or custom functions.
- **Memory**: Short-term and long-term memory configuration.

AgentCore automatically manages compute, microVM instantiation, network boundaries, and execution telemetry.

---

## 2. Key Architecture Features of the Harness

```
   Declarative Config (JSON / CLI)
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│             AgentCore Managed Harness Loop                  │
│                                                             │
│   ┌───────────────────────────────────────────────────────┐ │
│   │           Isolated microVM Session Sandbox            │ │
│   │                                                       │ │
│   │  ┌─────────────────┐    ┌───────────────────────────┐ │ │
│   │  │ Sandboxed Shell │    │   Persistent Filesystem   │ │ │
│   │  │  & Python Env   │    │  (Files, datasets, state) │ │ │
│   │  └─────────────────┘    └───────────────────────────┘ │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                             │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ Dynamic Multi-Model Swapping (Mid-Session)            │ │
│   │ (e.g., Claude for planning ──► Nova for execution)   │ │
│   └───────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       AgentCore Gateway             AgentCore Memory
      (MCP / Lambda Tools)         (Short & Long-Term)
```

### 1. Isolated microVM per Session
Every harness conversation runs in a dedicated, isolated microVM sandbox backed by Firecracker. Each session possesses:
- **Filesystem access**: Write scripts, generate spreadsheets, store images.
- **Sandboxed shell**: Execute code securely without risk to host infrastructure.
- **Persistence across timeouts**: Memory and designated mount storage survive session recycling.

### 2. Mid-Session Model Switching
A unique capability of the AgentCore Harness is **dynamic model swapping mid-conversation**:
- Plan a complex multi-step strategy with an advanced frontier model (e.g. Claude 3.5 Sonnet).
- Execute repetitive tool formatting or lightweight synthesis with a cost-efficient model (e.g. Amazon Nova Micro / Lite).
- Benchmark price-to-performance across providers without rebuilding the conversation session.

### 3. Native Integration with Gateway & MCP
The harness connects directly to:
- **AgentCore Gateway**: Exposes enterprise APIs and AWS Lambda functions as MCP tools.
- **Remote MCP Servers**: Standardized Model Context Protocol servers running anywhere.
- **Code Interpreter Tool**: Safe sandbox for statistical calculations, graph generation, and Python scripts.

---

## 3. Harness vs. Runtime: Which One Should You Use?

| Feature | AgentCore Harness | AgentCore Runtime |
| :--- | :--- | :--- |
| **Model of Development** | Configuration-driven (JSON / CLI flags) | Code-driven (Python / TypeScript / Go) |
| **Orchestration Code** | Handled 100% by AWS Bedrock | Handled by you via Strands, LangGraph, etc. |
| **Frameworks** | Built-in managed loop | Strands Agents SDK, LangGraph, CrewAI, Custom |
| **Compute Sandbox** | MicroVM with shell & filesystem included | MicroVM with custom container / zip package |
| **Best For** | Fastest zero-to-one prototyping, standard ReAct tool calling, deep research assistants | Custom multi-agent topologies (Swarms, Graphs), bespoke heuristics, custom API routes |
