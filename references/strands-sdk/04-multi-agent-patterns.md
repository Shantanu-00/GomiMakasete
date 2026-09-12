# Strands Agents SDK: Multi-Agent Architectural Patterns

> **Source**: AWS Machine Learning Blog ("Strands Agents SDK: A Technical Deep Dive into Agent Architectures and Observability")

---

## Overview

While single-agent systems handle focused tasks, complex real-world workflows (such as end-to-end municipal waste management, customer scheduling, compliance checking, or deep research) exceed the context window and cognitive capacity of a single prompt. 

Strands natively supports multiple multi-agent collaboration topologies without requiring bulky external orchestration engines.

---

## Pattern 1: Supervisor Model ("Agents as Tools")

In this pattern, an **Orchestrator Agent** manages a set of **Specialist Agents**. The orchestrator views each specialist as a callable tool.

```
                  ┌──────────────────────┐
                  │  Orchestrator Agent  │
                  │   (Coordinator LLM)  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ Classifier  │  │ Scheduling  │  │ Compliance  │
     │ Agent (Tool)│  │ Agent (Tool)│  │ Agent (Tool)│
     └─────────────┘  └─────────────┘  └─────────────┘
```

### Implementation (Python)
```python
from strands import Agent, tool
from strands_tools import calculator, current_time

# 1. Specialist 1: Waste Classification Expert
classifier_agent = Agent(
    system_prompt="You are an expert on Tokyo garbage sorting rules (Moeru, Moenai, Shigen, Sodai). Classify items accurately.",
    tools=[]
)

@tool
def waste_classifier_tool(item_description: str) -> str:
    """Classify discarded items into correct waste sorting categories."""
    result = classifier_agent(item_description)
    return str(result.message)

# 2. Specialist 2: Municipal Pickup Scheduling Expert
scheduler_agent = Agent(
    system_prompt="You manage pickup reservations, bulky waste sticker requirements, and calendar dates.",
    tools=[current_time]
)

@tool
def pickup_scheduler_tool(booking_request: str) -> str:
    """Schedule municipal bulky waste pickups and provide sticker fee requirements."""
    result = scheduler_agent(booking_request)
    return str(result.message)

# 3. Top-Level Orchestrator Agent
orchestrator = Agent(
    system_prompt=(
        "You are GomiMakasete Supervisor. When a resident asks for help, "
        "delegate classification questions to waste_classifier_tool, "
        "and booking questions to pickup_scheduler_tool. Synthesize clear, friendly answers."
    ),
    tools=[waste_classifier_tool, pickup_scheduler_tool, calculator]
)

# Execution
response = orchestrator("I have an broken microwave and 3 bags of leaves. How do I dispose of them and when can they be picked up?")
print(response.message)
```

**Benefits**:
- Clean separation of concerns.
- Modularity: Add, replace, or update specialist models independently.
- Independent prompts and tool sets prevent tool hallucination.

---

## Pattern 2: Peer-to-Peer Swarms (Mesh Networks)

In a Swarm or Peer-to-Peer topology, there is no central orchestrator. Instead, agents interact as equals in an open or mesh network.

```
       ┌────────────────────────┐
       │   Intake / Diagnostic  │
       └───────────▲────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐ ◄───► ┌─────────────────┐
│ Recycling Spec. │       │ Disposal Spec.  │
└────────┬────────┘       └────────┬────────┘
         │                         │
         └─────────► ┌─────────────▼─────────┐
                     │ Verifier / Auditor    │
                     └───────────────────────┘
```

### Collaboration Styles:
1. **Consensus / Brainstorming**: Agents build on each other's ideas until agreement is reached.
2. **Adversarial / Critique**: One agent generates an action plan; a Critic agent evaluates safety, cost, or regulatory compliance; an Editor agent refines.
3. **Shared Blackboard**: Agents read and write to a shared memory state or AgentCore Memory store.

---

## Pattern 3: Hierarchical Agent Graph (Multi-Tier Tree)

For large-scale enterprise workflows, the supervisor pattern extends into a multi-tier hierarchy:
- **Executive Tier**: High-level goal decomposition and user alignment.
- **Manager Tier**: Domain coordinators (e.g., Logistics Manager, Regulatory Compliance Manager).
- **Worker Tier**: Ground-level task runners (e.g., OCR Receipt Reader, Route Optimizer, Database Query Runner).

### Information Flow:
- **Tasks flow downward**: Executive breaks goals into milestone directives for Managers.
- **Results flow upward**: Workers return execution artifacts to Managers, who summarize for the Executive.

---

## Pattern 4: Agent-to-Agent (A2A) Remote Protocol

Strands agents can also communicate with remote agents hosted across different servers or microVMs using the **Agent-to-Agent (A2A)** protocol contract.
- Each agent runs as a standalone service (e.g., deployed to Bedrock AgentCore Runtime).
- Agents discover capabilities via agent manifests.
- Standardized request/response and streaming formats enable cross-team and cross-cloud collaboration.
