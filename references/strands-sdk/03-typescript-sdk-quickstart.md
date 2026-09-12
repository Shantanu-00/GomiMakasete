# Strands Agents SDK: TypeScript Developer Quickstart

> **Prerequisites**: Node.js 22+  
> **Package**: `@strands-agents/sdk`

---

## 1. Installation & Project Setup

```bash
mkdir my-agent
cd my-agent
npm init -y
npm pkg set type="module"

# Install core Strands SDK and Zod for schema validation
npm install @strands-agents/sdk zod

# Install TypeScript dev dependencies
npm install --save-dev @types/node typescript tsx
```

### `tsconfig.json` Configuration:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

---

## 2. Creating Custom Tools with `tool()` & Zod

Tools are defined using the `tool` helper function. Input schemas can use **Zod** or standard JSON Schema:

```typescript
import { tool } from '@strands-agents/sdk'
import { z } from 'zod'

export const wasteClassifierTool = tool({
  name: 'classify_waste',
  description: 'Determines the proper Japanese trash classification category for a household item.',
  inputSchema: z.object({
    item_name: z.string().describe('The name of the item to discard (e.g., plastic bottle, frying pan)'),
    material: z.string().optional().describe('Primary material if known (plastic, metal, paper, ceramic)'),
    dimensions_cm: z.number().optional().describe('Longest dimension in centimeters')
  }),
  callback: (input) => {
    const { item_name, dimensions_cm = 0 } = input
    
    // Check bulky waste threshold (typically > 30cm in Tokyo wards)
    if (dimensions_cm > 30) {
      return JSON.stringify({
        category: 'Sodai Gomi (Bulky Waste)',
        instructions: 'Requires appointment reservation and municipal sticker payment.',
        fee_required: true
      })
    }

    const lower = item_name.toLowerCase()
    if (lower.includes('bottle') || lower.includes('pet')) {
      return JSON.stringify({
        category: 'Recyclable PET Bottles',
        instructions: 'Remove cap and label; rinse thoroughly before disposal.',
        fee_required: false
      })
    }

    return JSON.stringify({
      category: 'Burnable (Moeru Gomi)',
      instructions: 'Dispose in standard transparent municipal trash bag.',
      fee_required: false
    })
  }
})
```

---

## 3. Creating and Invoking the Agent

Create `src/agent.ts`:

```typescript
import { Agent, BedrockModel } from '@strands-agents/sdk'
import { wasteClassifierTool } from './tools/wasteClassifier.js'

// 1. Configure Amazon Bedrock Model (optional custom configuration)
const bedrockModel = new BedrockModel({
  modelId: 'global.anthropic.claude-sonnet-4-6',
  region: 'us-east-1',
  temperature: 0.2,
})

// 2. Initialize Agent
const agent = new Agent({
  model: bedrockModel,
  tools: [wasteClassifierTool],
  // printer: false // Set to false to disable console printing
})

// 3. Invoke Agent
const prompt = 'I have a 45cm metal frying pan and an empty plastic water bottle. How should I throw them away?'
const result = await agent.invoke(prompt)

// Output final response
console.log('\n--- Final Response ---')
console.log(result.lastMessage)

// Access full history
console.log('\nTotal messages in session:', agent.messages.length)
```

Run directly with `tsx`:
```bash
npx tsx src/agent.ts
```

---

## 4. Streaming Responses (Async Iterator)

Ideal for Express, Fastify, or browser WebSockets:

```typescript
import { Agent } from '@strands-agents/sdk'
import { wasteClassifierTool } from './tools/wasteClassifier.js'

const agent = new Agent({
  tools: [wasteClassifierTool],
  printer: false,
})

async function streamResponse(prompt: string) {
  for await (const event of agent.stream(prompt)) {
    // Check event types
    if (event.type === 'text-delta') {
      process.stdout.write(event.text || '')
    } else if (event.type === 'tool-use') {
      console.log(`\n[Agent invoking: ${event.toolName}]`)
    }
  }
}

await streamResponse('What can I do with leftover cooking oil?')
```

---

## 5. Built-in / Vended Tools

Strands provides production-ready vended tools directly inside the SDK package:

```typescript
import { Agent } from '@strands-agents/sdk'
import { bash } from '@strands-agents/sdk/vended-tools/bash'

const agent = new Agent({
  tools: [bash],
})

const result = await agent.invoke('List the current files in the workspace directory.')
console.log(result.lastMessage)
```
