# Deploying Strands Agent to Amazon Bedrock AgentCore Runtime (TypeScript)

> **Source**: strandsagents.com (`deploy_to_bedrock_agentcore/typescript/`)

---

## Overview

This guide details how to build and containerize a TypeScript Strands agent with **Express** and deploy it to **Amazon Bedrock AgentCore Runtime**.

### Critical Architectural Contract:
- **Port**: Must listen on `8080`.
- **Architecture**: Container must be built for `linux/arm64`.
- **Payload Format**: AWS Bedrock sends binary request bodies to `/invocations`, so `express.raw()` middleware must be used.

---

## 1. Project Setup & Configuration

### `package.json`:
```json
{
  "name": "gomi-agent-ts",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@strands-agents/sdk": "latest",
    "@aws-sdk/client-bedrock-agentcore": "latest",
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.4.5"
  }
}
```

### `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

---

## 2. Server Implementation (`src/index.ts`)

```typescript
import express, { type Request, type Response } from 'express'
import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { z } from 'zod'

const PORT = Number(process.env.PORT) || 8080

// 1. Define custom tools
const bulkyItemChecker = tool({
  name: 'bulky_item_checker',
  description: 'Checks whether an item qualifies as Sodai Gomi (bulky waste) based on dimensions.',
  inputSchema: z.object({
    item_name: z.string(),
    max_dimension_cm: z.number().describe('Longest dimension in cm')
  }),
  callback: (input) => {
    const isBulky = input.max_dimension_cm >= 30
    return JSON.stringify({
      item: input.item_name,
      isBulkyWaste: isBulky,
      recommendation: isBulky
        ? 'Book municipal bulky trash pickup and buy sticker.'
        : 'Dispose in non-burnable or burnable bin as appropriate.'
    })
  }
})

// 2. Configure Bedrock Agent
const agent = new Agent({
  model: new BedrockModel({
    modelId: 'global.anthropic.claude-sonnet-4-6',
    region: process.env.AWS_REGION || 'us-east-1'
  }),
  tools: [bulkyItemChecker],
  printer: false
})

// 3. Initialize Express App
const app = express()

// MANDATORY: Health check endpoint
app.get('/ping', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'Healthy',
    timestamp: Math.floor(Date.now() / 1000)
  })
})

// MANDATORY: Invocations endpoint
// NOTE: AgentCore transmits binary data; decode using TextDecoder
app.post('/invocations', express.raw({ type: '*/*' }), async (req: Request, res: Response) => {
  try {
    const rawPayload = new TextDecoder().decode(req.body as Buffer)
    let prompt = ''

    try {
      const parsed = JSON.parse(rawPayload)
      prompt = parsed.prompt || parsed?.input?.prompt || rawPayload
    } catch {
      prompt = rawPayload
    }

    if (!prompt.trim()) {
      return res.status(400).json({ error: 'Empty prompt provided.' })
    }

    const result = await agent.invoke(prompt)

    return res.status(200).json({
      output: {
        message: result.lastMessage,
        model: 'strands-claude-ts'
      }
    })
  } catch (err: any) {
    console.error('Error invoking agent:', err)
    return res.status(500).json({ error: err?.message || 'Agent invocation failed.' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AgentCore Runtime listening on http://0.0.0.0:${PORT}`)
})
```

---

## 3. Containerization (`Dockerfile`)

```dockerfile
# Must build on or target linux/arm64
FROM --platform=linux/arm64 node:22-slim AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM --platform=linux/arm64 node:22-slim AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/index.js"]
```

---

## 4. Local Testing

```bash
# Start server locally:
npm run dev

# In another terminal:
curl -i http://localhost:8080/ping
curl -i -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Can I throw away a 50cm wooden shelf in standard trash?"}'
```
