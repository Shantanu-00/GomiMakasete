# Strands Agents SDK: Overview & Architecture

> **Source**: AWS Open Source Blog, AWS Machine Learning Blog, strandsagents.com  
> **License**: Apache-2.0  
> **GitHub**: https://github.com/strands-agents/harness-sdk

---

## 1. What is Strands Agents?

Strands Agents is an open-source, model-driven software development kit (SDK) created by AWS engineers (originally developed by the **Amazon Q Developer** team). It is used internally in mission-critical AWS products like Amazon Q Developer, AWS Glue, and VPC Reachability Analyzer.

### Core Philosophy: "A Library, Not a Platform"
- **Runs in your process**: Strands is simply an imported library in Python or TypeScript. Creating an agent means instantiating an object (`agent = Agent(...)`).
- **No hosted control plane**: There are no background daemons, mandatory schedulers, or proprietary databases required.
- **Pluggable everywhere**: Can be embedded into any FastAPI, Express, Next.js, Lambda, or Docker application with a few lines of code.
- **Model-driven rather than framework-heavy**: Instead of forcing developers into rigid, complex DAG/graph pipelines with manual state synchronization, Strands embraces the native reasoning, planning, tool selection, and reflection capabilities of modern foundation models (ReAct paradigm).

---

## 2. The Core Architecture: The "DNA Strands" Analogy

Just as two strands of DNA wind together to create genetic code, Strands connects two core elements:
1. **The Model**: The brain with native reasoning, tool calling, and planning capability.
2. **The Tools**: The functions and APIs providing action capabilities and real-world data.

```
       [ User Query & Context ]
                  │
                  ▼
   ┌───────────────────────────────┐
   │         Agent Loop            │
   │                               │
   │   ┌───────────────────────┐   │
   │   │  Model Reasoning      │◄──┼──┐
   │   └──────────┬────────────┘   │  │
   │              │                │  │ (Iterative ReAct loop)
   │              ▼                │  │
   │   ┌───────────────────────┐   │  │
   │   │  Tool Selection       │   │  │
   │   └──────────┬────────────┘   │  │
   │              │                │  │
   │              ▼                │  │
   │   ┌───────────────────────┐   │  │
   │   │  Tool Execution       ├───┘  │
   │   └───────────────────────┘      │
   └──────────────┬───────────────────┘
                  │
                  ▼
         [ Final Response ]
```

### The Three Components of Every Strands Agent:
1. **Model**: Configured model provider (Bedrock Claude Sonnet 4 by default, or OpenAI, Anthropic, Gemini, Ollama, etc.).
2. **Tools**: Python functions decorated with `@tool` or TypeScript definitions wrapped with `tool()`, plus community tools (`strands-agents-tools` / vended tools).
3. **Prompt**: Optional system prompt defining persona, constraints, and instructions.

---

## 3. Supported Model Providers

Strands is model-agnostic. While Amazon Bedrock is the production default, switching providers is a 1-line change:

| Provider | Python Identifier / Class | TypeScript Identifier / Class | Notes |
| :--- | :--- | :--- | :--- |
| **Amazon Bedrock (Default)** | `BedrockModel(model_id="...")` | `new BedrockModel({ modelId: "..." })` | Default: Claude Sonnet 4 / 4.6. Supports Amazon Nova, Claude, Llama, Mistral. |
| **Anthropic Direct API** | Direct Anthropic provider | Direct Anthropic provider | Contributed by Anthropic |
| **OpenAI** | `OpenAIModel(...)` | `OpenAIModel(...)` | Standard & OpenAI Responses API |
| **Google Gemini** | Google Provider | Google Provider | Full Gemini support |
| **Ollama** | Local Ollama Provider | Local Ollama Provider | Offline & self-hosted open weights |
| **LiteLLM** | `LiteLLMModel(...)` | Universal interface | Connects to 100+ model endpoints |
| **Custom Providers** | Subclass base `Model` | Subclass base `Model` | Implement custom inference APIs |

---

## 4. Key Capabilities & Ecosystem

1. **Autonomous ReAct Loop**: Automatically handles multiple tool invocations in a loop until the objective is reached or stop conditions are met.
2. **Streaming Support**:
   - Async iterators (`stream_async()` in Python, `stream()` in TypeScript) for real-time token delivery to web clients.
   - Callback handlers for lifecycle events.
3. **Bidirectional Streaming (`BidiAgent`)**:
   - Real-time voice and audio/text streaming using Bedrock Nova Sonic, Google Gemini Live, or OpenAI Realtime APIs.
4. **Tool Ecosystem**:
   - Custom functions with auto-schema generation from docstrings and type annotations.
   - Model Context Protocol (MCP) clients: Connect natively to MCP servers.
   - `strands-agents-tools`: Community package offering calculator, shell, python interpreter, file operations, web request tools.
5. **Observability**:
   - Native OpenTelemetry (OTEL) integration with spans emitted for model reasoning, tool invocations, and cycles.
   - Integration with AWS Distro for OpenTelemetry (ADOT) and CloudWatch Application Signals.
6. **Strands Evals SDK**: Comprehensive evaluation framework for measuring correctness, faithfulness, tool selection accuracy, and red-teaming simulators.
7. **Strands Shell & MCP Server**: CLI and MCP server for interacting with Strands agents and assisting IDE agents.
