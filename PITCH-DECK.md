# Epiminds: Multi-Agent Sales Council

## Pitch Deck Content — 7 Slides

---

## 🎯 Slide 1: The Problem

### Sales Calls Are Complex — One AI Isn't Enough

**The Challenge:**
- Complex B2B sales require expertise across **multiple domains** simultaneously
- Customers ask about pricing, materials, availability, design options, and timelines — all in one conversation
- Single AI assistants lack **specialized depth** and **fail under complexity**
- Human sales teams are expensive, slow to scale, and inconsistent

**The Stakes:**
- 67% of complex sales opportunities are lost due to **inadequate real-time support**
- Enterprise customers expect **instant, accurate answers** across all domains
- Traditional chatbots frustrate users with "I'll get back to you" responses

---

## 💡 Slide 2: Our Solution

### A Council of Specialized AI Agents That Collaborate in Real-Time

**Introducing the Agent Council:**
A multi-agent system where specialized AI agents **communicate, deliberate, and build on each other's work** to handle complex sales conversations.

**How It Works:**
1. **Customer speaks** → LiveKit Voice AI receives the message
2. **Call Agent** receives the request and broadcasts to the "Sales Floor"
3. **Specialist Agents** (Design, Timber, Availability, Upsell, Project) each contribute their expertise
4. **Call Agent synthesizes** all specialist input into a single, comprehensive response
5. **Customer receives** one unified, expert-level answer

**The Magic:** The customer talks to ONE agent, but gets the wisdom of MANY.

---

## 🏗️ Slide 3: Architecture Deep-Dive

### The Floor: Event-Driven Agent Orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│                        LIVEKIT VOICE AI                         │
│                     (Customer Phone Call)                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ receiveMessage
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CALL AGENT                              │
│         (Primary Interface — Routes & Synthesizes)              │
│                                                                 │
│  • Receives user messages                                       │
│  • Broadcasts to floor (sendToFloor)                           │
│  • Synthesizes specialist responses                            │
│  • Sends unified reply to user (replyToUser)                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ sendToFloor (broadcast)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      THE FLOOR (Global Bus)                     │
│                   Event-Driven Message Queue                    │
├─────────┬─────────┬──────────────┬────────────┬────────────────┤
│ Design  │ Timber  │ Availability │  Upsell    │   Project      │
│ Agent   │Specialist│ Scheduler   │ Commercial │   Architect    │
├─────────┼─────────┼──────────────┼────────────┼────────────────┤
│Products │Materials│ Lead Times   │ Bundles    │ Feasibility    │
│Pricing  │Wood Type│ Decorators   │ Upgrades   │ Dependencies   │
│Specs    │Stock    │ Scheduling   │ Margins    │ Risk Analysis  │
└─────────┴─────────┴──────────────┴────────────┴────────────────┘
                              │ replyToAgent → callAgent
                              ▼
                    ┌───────────────────┐
                    │   SYNTHESIZED     │
                    │   RESPONSE        │
                    │   (replyToUser)   │
                    └───────────────────┘
```

**Key Innovation:** Direct messages (targetId) vs Broadcast (no targetId) routing on the Floor.

---

## 🤖 Slide 4: The Specialist Agents

### Each Agent Has a Domain, Tools, and a Clear Role

| Agent | Expertise | Database Tools | Role |
|-------|-----------|----------------|------|
| **Call Agent** | Customer Communication | — | Routes requests, synthesizes responses, speaks to customer |
| **Design Agent** | Products, Specs, Pricing | `getProducts`, `getProductById`, `searchProducts` | Recommends designs, provides pricing |
| **Timber Specialist** | Wood Types, Materials | `checkMaterialAvailability`, `getMaterials` | Verifies material stock, flags constraints |
| **Availability Scheduler** | Lead Times, Decorators | `getLeadTime`, `getDecorators`, `getServices` | Provides timelines, schedules |
| **Upsell Commercial** | Revenue Optimization | `getProductById`, `getServices` | Identifies upsell/cross-sell opportunities |
| **Project Architect** | Feasibility, Dependencies | `getProducts`, `getMaterials` | Ensures project viability |

**Tool Calling:** Each agent has direct PostgreSQL database access via AI SDK function calling. They query real data, not hallucinations.

---

## 🔧 Slide 5: Tool-Calling System

### Real Database Access — Not Hallucinations

**The Stack:**
- **AI SDK** (Vercel) for structured tool calling
- **Zod Schemas** for type-safe parameters
- **PostgreSQL 17** for live inventory/pricing data
- **OpenRouter** for model routing (GPT, Claude, etc.)

**Example Tool: `checkMaterialAvailability`**

```typescript
// Agent asks: "Is oak available for a wardrobe?"
{
  toolName: "checkMaterialAvailability",
  args: { woodType: "Oak", quantityNeeded: 50 }
}

// Database returns real data:
{
  available: true,
  woodType: "Oak",
  quantityAvailable: 200,
  pricePerUnit: 85.00,
  leadTimeDays: 14,
  status: "In Stock",
  message: "Oak is available. 200 board feet in stock at £85 per unit."
}
```

**Why This Matters:**
- Agents provide **real, verifiable answers** from live databases
- No "I think the price is around..." — instead: "Oak wardrobes start at £2,400"
- Tool calls are logged for auditability and replay

---

## 📊 Slide 6: Event-Driven Communication

### Every Message Is Logged, Visualized, and Replayable

**Event Types (The Protocol):**

| Event Type | Description |
|------------|-------------|
| `receiveMessage` | Customer message arrives (from LiveKit) |
| `sendToFloor` | Call Agent broadcasts to all specialists |
| `acceptFromQueue` | Specialist claims the task |
| `replyToAgent` | Specialist sends findings to Call Agent |
| `replyToUser` | Call Agent sends final response to customer |

**Event Structure:**
```json
{
  "timestamp": 1500,
  "type": "replyToAgent",
  "actorId": "timberSpecialist",
  "targetId": "callAgent",
  "content": "Oak is available at £85/unit with 14-day lead time",
  "stateSnapshot": {
    "toolCalls": [
      { "toolName": "checkMaterialAvailability", "args": { "woodType": "Oak" } }
    ]
  }
}
```

**Visualization:** The Sales Call Scrubber lets you replay any conversation, see agent deliberations, and debug the council's reasoning.

---

## 🚀 Slide 7: Demo & What's Next

### Live Demo: "I Want a Fitted Wardrobe in Oak"

**Watch the council in action:**

1. **Customer (LiveKit):** "I want a fitted wardrobe in oak. What are my options?"

2. **Call Agent:** Broadcasts to floor (urgent)

3. **Council Deliberates:**
   - 🎨 **Design Agent:** "We have Modern Fitted Wardrobes at £2,400 and Custom designs from £3,500"
   - 🪵 **Timber Specialist:** "Oak is IN STOCK (200 board feet at £85/unit)"
   - 📅 **Availability Scheduler:** "Lead time: 21 days. John Miller available (£350/day)"
   - 💰 **Upsell Commercial:** "Recommend premium soft-close hinges (+£180)"
   - 🏗️ **Project Architect:** "Standard installation feasible. No structural concerns."

4. **Call Agent Synthesizes:** Unified response with all details

5. **Customer Receives:** One comprehensive, accurate answer

---

## What's Next

- **LiveKit Integration:** Full voice AI pipeline (in progress)
- **More Verticals:** Kitchen, Office, Bathroom specialists
- **Learning Loop:** Agent performance analytics + prompt optimization
- **Enterprise:** Multi-tenant, custom agent configurations

---

## Summary: Why This Wins

| Traditional Chatbot | Our Agent Council |
|---------------------|-------------------|
| Single AI, generic answers | Specialized experts collaborate |
| Hallucinated pricing/stock | Real database queries (tool calling) |
| "I'll get back to you" | Instant, comprehensive answers |
| Black box | Full event log, replayable, auditable |
| One-size-fits-all | Domain-specific agents with clear roles |

**The Bottom Line:**  
We built a **multi-agent system** where AI specialists **communicate, collaborate, and build on each other's work** — turning complex sales calls into seamless, expert-level customer experiences.

---

## Technical Appendix

### Key Files

| File | Purpose |
|------|---------|
| `packages/floor/src/simulator/Floor.ts` | Event routing (broadcast vs direct) |
| `packages/agents/src/agent.ts` | LLMAgent class with tool calling |
| `packages/agents/src/agents/*.ts` | Specialist agent definitions |
| `packages/agents/src/db/tools.ts` | Database tool implementations |
| `packages/agents/src/process-example.ts` | Council orchestration script |
| `apps/sales-replay-tool/` | Visualization UI (Sales Call Scrubber) |

### Running the Demo

```bash
# Process a customer request through the council
cd packages/agents
pnpm run process:example wardrobe-example.json

# View output in Sales Call Scrubber
# Load council-output.json in the UI
```

### Tech Stack

- **Frontend:** Next.js 16, React, Tailwind, Shadcn/UI
- **Backend:** Node.js, TypeScript, PostgreSQL 17
- **AI:** Vercel AI SDK, OpenRouter, Anthropic Claude, OpenAI GPT
- **Voice:** LiveKit (integration in progress)
- **Infra:** pnpm monorepo, Turborepo, Bun for testing

---

*Built for Epiminds x Lovable Hackathon — June 2024*
