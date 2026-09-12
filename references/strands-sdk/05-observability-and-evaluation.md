# Strands Observability & Evaluation: OpenTelemetry, CloudWatch & Evals SDK

---

## 1. Built-in In-Memory Observability (`AgentResult`)

Every execution in Strands returns an `AgentResult` object carrying deep telemetry:

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])
result = agent("Compute 48 * 25")

# 1. Summary dictionary
summary = result.metrics.get_summary()

print("Latency (ms):", summary["accumulated_metrics"]["latencyMs"])
print("Input Tokens:", summary["accumulated_usage"]["inputTokens"])
print("Output Tokens:", summary["accumulated_usage"]["outputTokens"])
print("Total Cycles:", summary["total_cycles"])

# 2. Tool-specific execution performance
tool_stats = summary["tool_usage"]["calculator"]["execution_stats"]
print("Calculator Success Rate:", tool_stats["success_rate"])
print("Calculator Execution Time:", tool_stats["total_time"])
```

---

## 2. Distributed Tracing with OpenTelemetry (OTEL)

Strands instruments all agent reasoning, cycle transitions, and tool calls as standard OpenTelemetry spans.

```
[ Trace: Agent Invocation ]
 ├── [ Span: Cycle 1 ]
 │    ├── [ Span: Model Request (Prompt tokens, Temperature) ]
 │    └── [ Span: Tool Execution: waste_classifier (Input, Output, Duration) ]
 └── [ Span: Cycle 2 ]
      └── [ Span: Model Request (Synthesis & Response) ]
```

### Propagating Session IDs via Baggage:
```python
from opentelemetry import baggage, context

# Attach session.id to telemetry context
session_id = "user-session-12345"
ctx = baggage.set_baggage("session.id", session_id)
token = context.attach(ctx)
```

---

## 3. Production Monitoring with AWS ADOT & CloudWatch

AWS Distro for OpenTelemetry (ADOT) provides zero-code instrumentation for Strands agents running in Amazon Bedrock AgentCore Runtime, EC2, ECS, or Lambda.

### Step 1: Install ADOT
```bash
pip install aws-opentelemetry-distro>=0.10.1 boto3
```

### Step 2: Enable CloudWatch Transaction Search
1. Open the AWS CloudWatch console.
2. Go to **Application Signals (APM) > Transaction search**.
3. Select **Enable Transaction Search** and check **Ingest spans as structured logs**.

### Step 3: Run with Auto-Instrumentation
```bash
# For local or VM execution:
opentelemetry-instrument python my_agent.py

# In Dockerfile CMD:
CMD ["opentelemetry-instrument", "python", "main.py"]

# In FastAPI / Uvicorn container:
CMD ["opentelemetry-instrument", "uvicorn", "agent:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## 4. The Strands Evals SDK

The Strands Evals SDK (`strands-agents-evals`) allows quantitative quality and safety benchmarking:

### 1. Built-in Evaluators:
- **Trajectory Evaluator**: Assesses whether the sequence of tool calls was optimal or redundant.
- **Tool Selection Accuracy**: Evaluates if the agent chose the right tool for the prompt.
- **Tool Parameter Accuracy**: Checks if arguments passed to tools matched expected types and values.
- **Faithfulness & Correctness**: Validates that answers are grounded in tool results without hallucination.
- **Goal Success Rate**: Binary or score-based task completion metric.

### 2. Simulators:
- **User Simulator**: Simulates multi-turn human conversationalists with various personas.
- **Tool Simulator**: Mocks backend failures, slow responses, and malformed outputs to test agent resilience.
- **Chaos Testing**: Injects random latencies and errors to ensure graceful fallback.

### 3. Red Teaming:
- Automated prompt injection, jailbreak attempts, and PII leakage probes.
- Generates comprehensive compliance audit reports before production deployment.
