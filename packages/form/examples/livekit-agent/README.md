# LiveKit Form Agent Examples

This directory contains example implementations of voice-driven form agents using `@hack/form/livekit`.

## Examples

### 1. Basic Example (`basic-example.ts`)

A simple CLI-based demonstration that shows the core concepts without requiring LiveKit infrastructure.

**Run it:**
```bash
GEMINI_API_KEY=your-key bun run examples/livekit-agent/basic-example.ts
```

**What it demonstrates:**
- Creating a form agent with a schema
- Processing user messages
- Handling validation errors
- Event listeners for tool execution and completion
- Progress tracking

**Use this to:**
- Understand the `@hack/form/livekit` API
- Test your schemas locally
- Debug form flows before deploying to LiveKit

### 2. Worker Example (`worker.ts`)

A complete LiveKit agent implementation using the LiveKit Agents framework.

**Prerequisites:**
```bash
npm install @livekit/agents
```

**Environment variables:**
- `LIVEKIT_URL` - Your LiveKit server URL
- `LIVEKIT_API_KEY` - Your LiveKit API key
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `GEMINI_API_KEY` - Your Google Gemini API key

**What it demonstrates:**
- Full voice agent setup with STT/TTS
- Session management across multiple rooms
- Real-time form state synchronization
- Cleanup on disconnect

**Use this as:**
- A production-ready template for voice form agents
- Reference for LiveKit Agents Framework integration

## Quick Start

1. **Test locally first:**
   ```bash
   cd packages/form
   GEMINI_API_KEY=your-key bun run examples/livekit-agent/basic-example.ts
   ```

2. **Deploy to LiveKit:**
   - Install dependencies: `npm install @livekit/agents`
   - Configure environment variables
   - Run the worker: `bun run examples/livekit-agent/worker.ts`

## Architecture Overview

Both examples use the same core pattern:

```typescript
// 1. Create agent
const agent = createLiveKitFormAgent(sessionId, {
  schema: yourZodSchema,
  model: google('gemini-2.5-pro'),
});

// 2. Get greeting
const greeting = agent.getGreeting();

// 3. Process user speech
const response = await agent.handleUserMessage(userText);

// 4. Check completion
if (agent.isComplete()) {
  const data = agent.getData();
  // Save to database, trigger workflow, etc.
}
```

## Next Steps

- Read the [LiveKit Integration README](../../src/livekit/README.md) for full API documentation
- Customize the schema for your use case
- Add persistence (Redis, PostgreSQL) for production deployments
- Integrate with your existing Temporal workflows

## Troubleshooting

**"Cannot find module @livekit/agents"**
- The worker example requires `@livekit/agents` to be installed
- Run: `npm install @livekit/agents`

**Agent not responding to voice**
- Check GEMINI_API_KEY is set correctly
- Verify LiveKit room connection (check logs)
- Enable debug mode: `debug: true` in config

**Form not completing**
- Check schema validation (enable `debug: true`)
- Verify all required fields are provided
- Check for validation errors in event handlers
