# @hack/form/livekit - Voice Agent Integration

A LiveKit voice agent adapter for `@hack/form` that enables conversational form completion through voice interactions.

## Overview

This integration connects the deterministic schema engine of `@hack/form` with LiveKit's real-time voice infrastructure, allowing you to conduct structured interviews entirely through voice conversation. The agent acts as a stateful interviewer that:

- **Validates in real-time** - Catches errors and asks users to correct them conversationally
- **Enforces schema flow** - Prevents hallucination by only exposing tools for current step
- **Handles branching** - Naturally navigates discriminated unions and conditional fields
- **Supports handoff** - Resume partially completed forms from web UI to voice and vice versa

## Key Features

### Zero-Hallucination Flow
The conversation is strictly bounded by your Zod schema. The AI cannot invent questions, skip required fields, or deviate from the defined structure.

### Horizontal Non-Linearity
Users can fill multiple fields in the current step at once (e.g., "My name is Alice and I'm 25 years old"), but cannot skip ahead to future steps.

### Conversational Error Handling
Validation errors are translated into natural language prompts rather than technical error codes.

### Stateful Sessions
Sessions maintain conversation history and form state, enabling seamless interruption and resumption.

## Installation

```bash
npm install @hack/form @livekit/agents
```

## Quick Start

### 1. Define Your Schema

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().describe("User's full name"),
  email: z.string().email().describe("Email address"),
  propertyType: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("house"),
      bedrooms: z.number().min(1),
    }),
    z.object({
      type: z.literal("flat"),
      floor: z.number(),
    }),
  ]),
});
```

### 2. Create Form Agent

```typescript
import { createLiveKitFormAgent } from '@hack/form/livekit';
import { google } from '@ai-sdk/google';

const agent = createLiveKitFormAgent('session-id', {
  schema,
  model: google('gemini-2.5-pro'),
  debug: true,
});

// Setup event handlers
agent.on('formCompleted', ({ data }) => {
  console.log('Form completed!', data);
  // Save to database, trigger workflow, etc.
});

agent.on('validationError', ({ field, errors }) => {
  console.log(`Validation error on ${field}:`, errors);
});
```

### 3. Handle Voice Interactions

```typescript
// Get initial greeting
const greeting = agent.getGreeting();
await speakToUser(greeting); // Your TTS implementation

// Process user speech
assistant.on('user_speech_committed', async (message) => {
  const response = await agent.handleUserMessage(message.text);
  await speakToUser(response);

  if (agent.isComplete()) {
    const finalData = agent.getData();
    await saveFormData(finalData);
  }
});
```

## API Reference

### `createLiveKitFormAgent(sessionId, config)`

Creates a new form agent instance.

**Parameters:**
- `sessionId: string` - Unique identifier for this session
- `config: LiveKitFormAgentConfig` - Configuration object:
  - `schema: z.ZodTypeAny` - The Zod schema defining the form
  - `model: any` - AI SDK model instance (e.g., `google('gemini-2.5-pro')`)
  - `initialData?: any` - Initial form data (for resuming sessions)
  - `welcomeMessage?: string` - Custom welcome message for new users
  - `resumeMessage?: string` - Custom message for returning users
  - `debug?: boolean` - Enable debug logging
  - `voicePersona?: string` - Custom system prompt modifications for voice persona

**Returns:** `LiveKitFormAgent`

### `LiveKitFormAgent`

#### Methods

##### `getGreeting(): string`
Returns the initial greeting message based on session state (new vs resume).

##### `handleUserMessage(text: string): Promise<string>`
Core interaction method. Processes user speech and returns the agent's response.

**Flow:**
1. Adds user message to conversation history
2. Gets current form state
3. Generates dynamic tools (only for current step)
4. Calls LLM with voice-optimized system prompt
5. Executes tool calls against form schema
6. Handles validation errors
7. Returns conversational response

##### `isComplete(): boolean`
Returns `true` if the form has been fully completed.

##### `getData(): any`
Returns the current form data.

##### `updateData(data: any): void`
Updates form data externally (useful for web ↔ voice handoff).

##### `getSession(): LiveKitFormSession`
Returns the current session state.

##### `getMessages(): Array<{role, content}>`
Returns the conversation history.

#### Events

##### `on('sessionStarted', handler)`
Emitted when a new session is created.

##### `on('toolExecuted', handler)`
Emitted after each tool execution.
```typescript
agent.on('toolExecuted', ({ toolName, args, success, message }) => {
  console.log(`Tool ${toolName}: ${success ? 'success' : 'failed'}`);
});
```

##### `on('validationError', handler)`
Emitted when a validation error occurs.
```typescript
agent.on('validationError', ({ field, errors }) => {
  console.log(`Field ${field} validation failed:`, errors);
});
```

##### `on('formCompleted', handler)`
Emitted when the form is fully completed.
```typescript
agent.on('formCompleted', ({ data, sessionId }) => {
  await saveToDatabase(data);
});
```

## Architecture

### The Interaction Loop

For each user utterance:

1. **State Retrieval** - Get current cursor position, completed fields, and errors
2. **Dynamic Tool Generation** - Generate `set_*` tools ONLY for active fields
3. **Voice Prompt Creation** - Build conversational system prompt
4. **LLM Call** - Generate response with tools
5. **Tool Execution** - Execute tool calls through form adapter
6. **Validation** - Schema validates the data
7. **Error Handling** - Convert validation errors to natural language
8. **Response** - Return conversational response to user

### Tool Gating

The critical feature is **strict tool gating**:

```typescript
// Step 0: Only name and email tools available
// User cannot call set_propertyType yet

// After step 0 is valid:
// Step 1: propertyType discriminator tool becomes available
// Other fields still hidden

// After type="flat" is selected:
// Step 1: floor tool becomes available
// bedrooms tool (from house branch) is NOT available
```

This prevents the AI from:
- Skipping required fields
- Accessing fields in conditional branches that aren't selected
- Jumping ahead to future steps

### Voice-Specific Optimizations

The integration includes voice-optimized formatters that:

- Remove bullet points and lists from prompts
- Keep responses under 2-3 sentences
- Use conversational acknowledgments ("Got it", "Perfect")
- Convert validation errors to friendly questions
- Add natural speech patterns with contractions

## Schema Patterns

### Multi-Step Forms (Tuples)

Use `z.tuple()` for sequential steps:

```typescript
const schema = z.tuple([
  // Step 0: Basic Info
  z.object({
    name: z.string(),
    email: z.string().email(),
  }),

  // Step 1: Address
  z.object({
    street: z.string(),
    city: z.string(),
  }),
]);
```

The agent will complete step 0 before exposing step 1 tools.

### Branching Logic (Discriminated Unions)

```typescript
const schema = z.discriminatedUnion("propertyType", [
  z.object({
    propertyType: z.literal("house"),
    garden: z.boolean(),
    garage: z.boolean(),
  }),
  z.object({
    propertyType: z.literal("flat"),
    floor: z.number(),
    hasLift: z.boolean(),
  }),
]);
```

The agent will:
1. First ask for `propertyType`
2. Based on selection, expose either house or flat fields
3. Never expose fields from the unselected branch

### Descriptions for Better Prompting

```typescript
const schema = z.object({
  age: z.number()
    .min(18)
    .describe("User's age in years (must be 18 or older)"),
  email: z.string()
    .email()
    .describe("Primary email address for contact"),
});
```

Descriptions are used to generate tool descriptions that guide the LLM.

## Integration Examples

### With LiveKit Agents Framework

See `examples/livekit-agent/worker.ts` for a complete example using the LiveKit Agents SDK.

### With Temporal Workflows

```typescript
import { proxyActivities } from '@temporalio/workflow';
import { createStatelessAIForm } from '@hack/form/ai';

export async function voiceOnboardingWorkflow(userId: string) {
  let formData = {};

  while (true) {
    const { state, process } = createStatelessAIForm(schema, formData);

    if (state.formState.isComplete) {
      return formData;
    }

    // Wait for user to speak
    const userMessage = await activities.waitForUserMessage(userId);

    // Generate voice-optimized prompt
    const systemPrompt = generateVoiceSystemPrompt(
      state.formState.currentCursor,
      state.formState.errors,
      state.formState.completedSteps,
      state.formState.futureSteps,
    );

    // Call LLM
    const response = await activities.callLLM({
      system: systemPrompt,
      tools: toAISDKTools(state.tools),
      message: userMessage,
    });

    // Process tools
    const result = process(response.toolCalls);
    formData = result.data;

    // Speak response
    await activities.speakToUser(userId, response.text);
  }
}
```

### Web ↔ Voice Handoff

```typescript
// User starts on web, completes half the form
const webFormData = { name: "Alice", email: "alice@example.com" };

// User switches to voice
const agent = createLiveKitFormAgent('session-123', {
  schema,
  model: google('gemini-2.5-pro'),
  initialData: webFormData, // Resume from web state
});

// Agent automatically recognizes progress
const greeting = agent.getGreeting();
// "Welcome back! I see we were working on your property information. Let's continue..."

// Later: sync back to web
const currentData = agent.getData();
await updateWebUI(currentData);
```

## Best Practices

### 1. Use Detailed Descriptions
Add `.describe()` to every field for better AI understanding:
```typescript
z.string().describe("User's preferred contact phone number (mobile preferred)")
```

### 2. Handle Form Completion Events
Always listen to `formCompleted` to persist data:
```typescript
agent.on('formCompleted', async ({ data }) => {
  await database.saveForm(sessionId, data);
  await notifyUser("Form submitted successfully!");
});
```

### 3. Enable Debug Mode During Development
```typescript
const agent = createLiveKitFormAgent(sessionId, {
  schema,
  model,
  debug: true, // Logs tool calls, state changes, etc.
});
```

### 4. Persist Session State
For production, store session data in Redis or similar:
```typescript
// On each message
const data = agent.getData();
await redis.set(`session:${sessionId}`, JSON.stringify(data));

// On reconnect
const savedData = JSON.parse(await redis.get(`session:${sessionId}`));
const agent = createLiveKitFormAgent(sessionId, {
  schema,
  model,
  initialData: savedData,
});
```

### 5. Custom Voice Persona
Tailor the agent's personality:
```typescript
const agent = createLiveKitFormAgent(sessionId, {
  schema,
  model,
  voicePersona: `You are a professional mortgage advisor.
    Be empathetic and patient.
    Acknowledge that financial forms can be stressful.
    Keep responses under 20 words.`,
});
```

## Troubleshooting

### Agent Skipping Required Fields
**Cause:** Schema validation might be passing when it shouldn't.
**Fix:** Check your schema's optional fields and min/max constraints.

### Validation Errors Not Handled Gracefully
**Cause:** Missing descriptions in schema.
**Fix:** Add `.describe()` to all fields with validation rules.

### Agent Repeating Questions
**Cause:** LLM not recognizing successful tool execution.
**Fix:** Ensure tool execution result messages are clear. Check `debug: true` logs.

### Session State Lost on Reconnect
**Cause:** No persistence layer.
**Fix:** Implement session storage (Redis, database) and pass `initialData` on reconnect.

## Examples

- **Basic Example:** `examples/livekit-agent/basic-example.ts` - Simple CLI-based demo
- **Full Worker:** `examples/livekit-agent/worker.ts` - Complete LiveKit Agent implementation

Run the basic example:
```bash
GEMINI_API_KEY=your-key bun run examples/livekit-agent/basic-example.ts
```

## Related Documentation

- [Main @hack/form README](../../README.md)
- [AI Adapter Documentation](../ai/README.md)
- [LiveKit Agents Framework](https://docs.livekit.io/agents/)
- [Vercel AI SDK](https://sdk.vercel.ai/)

## License

MIT
