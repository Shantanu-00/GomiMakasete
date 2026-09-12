# Amazon Bedrock AgentCore: Memory Architecture Guide

> **Source**: AWS Official Documentation (`memory.md`, `memory-types.md`, `long-term-memory-long-term.md`)

---

## 1. Overview: Solving the Statelessness Problem

LLMs are inherently stateless. Once a request completes or a process restarts, conversational context and user history vanish.

**AgentCore Memory** is a fully managed cloud memory service that decouples state from compute. It provides:
1. **Short-Term Memory**: Conversation events and transcript history within active sessions.
2. **Long-Term Memory (LTM)**: Persistent knowledge, user preferences, and synthesized summaries that persist across distinct sessions, weeks, or months.

```
                    ┌────────────────────────┐
                    │      User Request      │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ AgentCore Memory Store │
                    └─────┬────────────┬─────┘
                          │            │
         ┌────────────────┘            └────────────────┐
         ▼                                              ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│      Short-Term Memory       │       │       Long-Term Memory       │
│  - Raw multi-turn events     │       │  - Semantic Knowledge Facts  │
│  - Active session transcript │       │  - User Preferences          │
│  - Exact turn-by-turn context│       │  - Rolling Summaries         │
│                              │       │  - Episodic Experiences      │
└──────────────────────────────┘       └──────────────────────────────┘
```

---

## 2. Short-Term Memory (Sessions & Events)

Short-term memory captures the verbatim back-and-forth interactions of a conversation.

### Core API Operations:
- **`CreateEvent`**: Records a conversational turn (user prompt, agent response, or tool payload) tagged with a unique `sessionId`.
- **`ListEvents`**: Retrieves the chronological message log for an ongoing session.
- **`ListSessions`**: Lists previous sessions associated with a specific user or tenant.
- **`GetEvent` / `DeleteEvent`**: Inspects or purges individual event records.

### Benefit:
If a user closes their browser or an agent microVM scales down, the next invocation with the same `sessionId` seamlessly reloads the exact multi-turn history.

---

## 3. Long-Term Memory (Persistent Strategies)

Long-term memory is powered by asynchronous background extractors called **Strategies**. As conversations take place, AgentCore analyzes the dialogue and extracts long-term insights into structured vector stores.

### The 4 Built-In Long-Term Memory Strategies:

| Strategy | What it Extracts | Municipal/Everyday Agent Example |
| :--- | :--- | :--- |
| **1. Semantic Memory** | Factual statements, entity relationships, and domain facts. | *"Resident lives in Setagaya-ku, 3rd district, which collects burnable trash on Tuesdays and Fridays."* |
| **2. User Preference** | Personal habits, communication preferences, and explicit user rules. | *"Prefers LINE notifications over email; requests English disposal instructions."* |
| **3. Summary Strategy** | Compact, rolling digests of multi-turn interactions to prevent context window bloat. | *"On Sept 5, user inquired about discarding a sofa. Fee was calculated at ¥2,500. Pickup booked for Sept 15."* |
| **4. Episodic Memory** | Experiences, past problem-solving attempts, and outcome tracking. | *"Previous attempt to recycle lithium battery at standard drop-off was rejected. User must use certified electronics bin."* |

---

## 4. Enabling Memory via AgentCore CLI

When creating or modifying your project:

```bash
# Enable short-term memory only:
agentcore create --name GomiAgent --memory shortTerm

# Enable both short-term and persistent long-term memory:
agentcore create --name GomiAgent --memory longAndShortTerm
```

This automatically generates the necessary Memory resource ARNs and links in `agentcore/agentcore.json`.

---

## 5. Integrating AgentCore Memory with Strands (Python)

```python
import boto3
import json
from strands import Agent

# Initialize Bedrock AgentCore Memory client
memory_client = boto3.client('bedrock-agentcore', region_name='us-west-2')

def retrieve_user_context(memory_id: str, actor_id: str) -> str:
    """Fetch long-term preferences and facts for the current resident."""
    try:
        response = memory_client.retrieve_memory_records(
            memoryId=memory_id,
            actorId=actor_id,
            maxResults=5
        )
        records = response.get("records", [])
        return "\n".join([f"- {r['content']['text']}" for r in records if 'text' in r['content']])
    except Exception:
        return "No prior memory records found."

# Use retrieved memory in Strands agent initialization
user_id = "resident_tokyo_987"
memories = retrieve_user_context("mem-store-xyz", user_id)

system_prompt = f"""
You are GomiMakasete, personal waste assistant.
Known resident preferences and facts:
{memories}
"""

agent = Agent(system_prompt=system_prompt)
```
