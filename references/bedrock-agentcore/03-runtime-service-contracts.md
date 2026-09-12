# Amazon Bedrock AgentCore Runtime: Service Contracts & Protocols

> **Source**: AWS Official Documentation (`runtime-service-contract.md`, `runtime-http-protocol-contract.md`)

---

## 1. The HTTP Service Contract

When deploying custom code (Python, TypeScript, Go, etc.) to Amazon Bedrock AgentCore Runtime, your container or application **MUST** strictly conform to the HTTP service contract.

### Fundamental Specifications:
1. **Network Port**: Application must bind to `0.0.0.0:8080`.
2. **CPU Architecture**: Pre-compiled binaries and container images must target **`linux/arm64`**.
3. **Mandatory Endpoints**:
   - `GET /ping`: Health check used by AgentCore lifecycle monitor.
   - `POST /invocations`: Receives user input, payload context, and returns agent output.

```
       Amazon Bedrock AgentCore Runtime
                      │
        ┌─────────────┴─────────────┐
        │                           │
  GET /ping                  POST /invocations
  (Health Check)             (Binary/JSON Payload)
        │                           │
        ▼                           ▼
 200 {"status":"healthy"}    200 {"output": ...}
```

---

## 2. Health Check: `GET /ping`

The runtime sends periodic health checks to verify your service is ready to accept traffic.
- **Request**: `GET http://0.0.0.0:8080/ping`
- **Expected Status**: `200 OK`
- **Recommended Response Body**:
```json
{
  "status": "healthy",
  "time_of_last_update": 1726000000
}
```

---

## 3. Invocation: `POST /invocations`

When an end-user or upstream system invokes the agent runtime via the AWS SDK (`invoke_agent_runtime`), AgentCore proxies the request to your application.

### Important Notes on Payload Handling:
- **Binary Encoded**: The AWS SDK transmits payloads as raw binary buffers (`bytes`). Your web server should be equipped to parse raw bytes or auto-decode UTF-8 JSON.
- **Session Identification**: AgentCore injects session identifiers via headers or request parameters.

### Standard Request Body:
```json
{
  "input": {
    "prompt": "How do I dispose of old aerosol spray cans?"
  }
}
```

### Standard Response Body:
```json
{
  "output": {
    "message": "Aerosol cans must be completely emptied in a well-ventilated area outside before disposal. Do not puncture them. Place them with non-burnable or metal recycling depending on your local ward rules.",
    "timestamp": "2026-09-10T22:00:00Z",
    "model": "strands-claude-sonnet"
  }
}
```

---

## 4. Streaming Responses (SSE / Chunked Transfer)

AgentCore Runtime supports streaming responses back to clients using chunked transfer encoding (`Transfer-Encoding: chunked`) or Server-Sent Events (SSE).

### Python Example:
```python
from fastapi.responses import StreamingResponse

@app.post("/invocations")
async def invoke(payload: dict):
    async def event_generator():
        async for chunk in agent.stream_async(payload.get("prompt", "")):
            if "data" in chunk:
                yield chunk["data"].encode("utf-8")
                
    return StreamingResponse(event_generator(), media_type="text/plain")
```

---

## 5. Other Supported Protocol Contracts

In addition to standard HTTP endpoints, AgentCore Runtime provides native support for:

1. **MCP Protocol Contract**:
   - Allows hosting an MCP (Model Context Protocol) server directly inside the AgentCore microVM.
   - Enables standard tool listing (`tools/list`) and execution (`tools/call`) over HTTP/SSE.
2. **A2A (Agent-to-Agent) Protocol Contract**:
   - Standardized interface allowing autonomous agents running in separate microVMs or accounts to discover capabilities, negotiate tasks, and stream progress.
3. **WebSocket Bidirectional Streaming**:
   - Full duplex communication channel supporting sub-second voice interactions (e.g. Amazon Nova Sonic or Gemini Live).
