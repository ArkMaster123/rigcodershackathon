# @hack/floor

A TypeScript implementation of a Sales Floor Simulator using hybrid message routing.

## Overview

The Floor package implements a message routing system for multi-agent communication using the `queueable` library. It supports two routing modes:

- **Direct Messaging**: Messages with a `targetId` are routed to a specific agent's private mailbox
- **Broadcast Messaging**: Messages without a `targetId` are broadcast to all agents on the floor

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                       Floor                         │
│                                                     │
│  ┌──────────────┐         ┌──────────────────────┐ │
│  │ Global Bus   │◄────────┤ Broadcast Messages   │ │
│  │ (Multicast)  │         │ (no targetId)        │ │
│  └──────────────┘         └──────────────────────┘ │
│                                                     │
│  ┌──────────────┐         ┌──────────────────────┐ │
│  │ Agent Queue  │◄────────┤ Direct Messages      │ │
│  │ (Channel)    │         │ (with targetId)      │ │
│  └──────────────┘         └──────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Core Components

### Floor

The central orchestrator that manages agents and routes messages.

```typescript
import { Floor } from '@hack/floor';

const floor = new Floor();
```

**Key Methods:**

- `registerAgent(agent: FloorAgent): AgentMailbox` - Register an agent and get its mailbox
- `dispatch(event: FloorEvent): void` - Route an event (direct or broadcast)
- `getLog(): FloorEvent[]` - Get complete event history for replay
- `getFloorTime(): number` - Get milliseconds since floor started

### FloorAgent

Abstract base class for all agents. Agents consume messages from both:
1. Their private mailbox (direct messages)
2. The global bus (broadcast messages)

```typescript
import { FloorAgent } from '@hack/floor';
import type { FloorEvent, AgentConfig } from '@hack/floor';

class MyAgent extends FloorAgent {
    async processEvent(event: FloorEvent, history: FloorEvent[]): Promise<FloorEvent | null> {
        // Process event and optionally return a response
        return null;
    }
}
```

**Key Methods:**

- `start(onEvent: (event: FloorEvent) => void | Promise<void>)` - Start consuming messages
- `processEvent(event: FloorEvent, history: FloorEvent[])` - Abstract method to implement

### FloorEvent

The core event type for all floor communications.

```typescript
interface FloorEvent {
    timestamp: number;
    type: EventType;
    actorId: string;
    targetId?: string; // If present: Direct. If absent: Broadcast
    urgent?: boolean;
    content?: string;
    stateSnapshot?: Record<string, unknown>;
}
```

**Event Types:**

- `receiveMessage` - Message from user to sales agent
- `sendToFloor` - Multicast to sales floor
- `acceptFromQueue` - Floor agent starts working on a task
- `replyToAgent` - Sales floor agent replies to the sales agent
- `replyToUser` - Sales agent replies to the user
- `logState` - General state logging

## Usage Example

```typescript
import { Floor, FloorAgent } from '@hack/floor';
import type { FloorEvent, AgentConfig } from '@hack/floor';

// Define a custom agent
class ExpertAgent extends FloorAgent {
    constructor(config: AgentConfig, private keywords: string[]) {
        super(config);
    }

    async processEvent(event: FloorEvent, history: FloorEvent[]): Promise<FloorEvent | null> {
        // Direct message - always handle
        if (event.targetId === this.config.id) {
            return {
                timestamp: Date.now(),
                type: 'replyToAgent',
                actorId: this.config.id,
                targetId: event.actorId,
                content: `Processed: ${event.content}`
            };
        }

        // Broadcast - filter by expertise
        const hasExpertise = this.keywords.some(kw =>
            event.content?.toLowerCase().includes(kw)
        );

        if (hasExpertise) {
            return {
                timestamp: Date.now(),
                type: 'acceptFromQueue',
                actorId: this.config.id,
                content: `Handling: ${event.content}`
            };
        }

        return null;
    }
}

// Setup
const floor = new Floor();

const agent = new ExpertAgent(
    { id: 'lumber', systemPrompt: 'Expert', model: 'test' },
    ['wood', 'lumber']
);

floor.registerAgent(agent);

// Start agent
agent.start(async (event) => {
    const response = await agent.processEvent(event, floor.getLog());
    if (response) {
        floor.dispatch(response);
    }
});

// Send broadcast
floor.dispatch({
    timestamp: Date.now(),
    type: 'sendToFloor',
    actorId: 'phone',
    content: 'Need help with wood pricing'
});

// Send direct message
floor.dispatch({
    timestamp: Date.now(),
    type: 'sendToFloor',
    actorId: 'phone',
    targetId: 'lumber',
    content: 'Quote for 2x4 lumber',
    urgent: true
});

// Get event log for replay
const log = floor.getLog();
```

## Running Examples

```bash
# Basic routing example
npx tsx packages/floor/examples/basic-routing.ts

# Streaming example (demonstrates real-time consumption)
npx tsx packages/floor/examples/streaming-example.ts
```

## Integration

The floor package is used by:

- `apps/sales-floor` - Production sales floor simulator
- `apps/sales-replay-tool` - Visualization tool (uses separate SimulationEvent types)

Note: The replay tool maintains its own visualization event types that are distinct from the floor protocol events.

## Key Features

✅ Hybrid routing (Direct vs Broadcast)
✅ Real-time async message processing
✅ Complete event logging for replay
✅ Agent expertise filtering
✅ Urgent message flagging
✅ Type-safe event schema

## Dependencies

- `queueable` - Channel and Multicast primitives
- `zod` - Schema validation
