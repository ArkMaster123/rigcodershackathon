# @hack/form/ai

The AI adapter for `@hack/form` enables Large Language Models to intelligently drive complex, schema-defined data collection flows.

## Overview

Unlike the React adapter which renders UI components, the AI adapter "renders" a dynamic set of LLM Tools and System Prompts. This allows you to plug any Zod schema into an AI SDK (like Vercel AI SDK or OpenAI), creating an agent that can:

- **Interview users intelligently** - Ask questions based on the schema
- **Validate input** - Enforce strict schema rules
- **Navigate branching logic** - Handle discriminated unions and conditional fields
- **Fill non-linearly** - Accept multiple fields at once if user provides them

## Quick Start

### 1. Install Dependencies

```bash
npm install @hack/form zod
```

### 2. Define Your Schema

```typescript
import { z } from "zod";

const onboardingSchema = z.tuple([
  // Step 1: Basic Info
  z.object({
    name: z.string(),
    email: z.string().email(),
  }),

  // Step 2: User Type (Branching Logic)
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("personal"),
      hobbies: z.string(),
    }),
    z.object({
      type: z.literal("business"),
      company: z.string(),
      vatId: z.string(),
    }),
  ]),
]);
```

### 3. Create AI Form Adapter

```typescript
import { createAIForm } from "@hack/form/ai";

const form = createAIForm(onboardingSchema);
```

### 4. Use with AI SDK

#### Vercel AI SDK Example

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

async function handleUserMessage(userMessage: string) {
  const state = form.getState();

  const response = await generateText({
    model: openai("gpt-4"),
    tools: form.getAISDKTools(),
    system: state.systemPrompt,
    prompt: userMessage,
  });

  // Process tool calls
  for (const toolCall of response.toolCalls) {
    form.executeTool(toolCall.name, toolCall.args);
  }

  // Check if complete
  if (form.isComplete()) {
    console.log("Form completed!", form.getData());
  }

  return response.text;
}
```

## API Reference

### `createAIForm(schema, initialData?)`

Creates a stateful AI form adapter.

**Parameters:**
- `schema: z.ZodTypeAny` - The Zod schema defining your form
- `initialData?: any` - Optional initial data (default: `{}`)

**Returns:** `AIFormAdapter`

```typescript
const form = createAIForm(mySchema, { name: "Alice" });
```

### `AIFormAdapter`

#### `getState(): AIFormState`

Gets the current form state including tools, system prompt, and form status.

```typescript
const state = form.getState();
console.log(state.systemPrompt);  // System prompt for AI
console.log(state.tools);          // Available tools
console.log(state.formState);      // Core form state
```

#### `executeTool(toolName, args): ToolExecutionResult`

Executes a single tool call.

```typescript
const result = form.executeTool("set_name", { value: "Alice" });
if (result.success) {
  console.log("Field updated!");
} else {
  console.log("Validation error:", result.message);
}
```

#### `processTools(toolCalls): { data, results, messages }`

Processes multiple tool calls in sequence.

```typescript
const { data, results, messages } = form.processTools([
  { name: "set_name", args: { value: "Alice" } },
  { name: "set_age", args: { value: 25 } },
]);
```

#### `getAISDKTools(): Record<string, any>`

Returns tools in AI SDK format (compatible with Vercel AI SDK, OpenAI, etc.).

```typescript
const tools = form.getAISDKTools();
// Use with AI SDK
```

#### `getData(): any`

Gets the current form data.

```typescript
const data = form.getData();
```

#### `setData(data): void`

Updates the form data (useful for external updates).

```typescript
form.setData({ name: "Bob" });
```

#### `isComplete(): boolean`

Checks if the form is complete.

```typescript
if (form.isComplete()) {
  console.log("Ready to submit!");
}
```

### `createStatelessAIForm(schema, data)`

Creates a stateless interface for use in workflows like Temporal.

**Returns:** `{ state, process }`

```typescript
// In a Temporal workflow
async function collectData(userMessage: string, currentData: any) {
  const { state, process } = createStatelessAIForm(schema, currentData);

  const response = await generateText({
    model: openai("gpt-4"),
    tools: toAISDKTools(state.tools),
    system: state.systemPrompt,
    prompt: userMessage,
  });

  // Process and return new data
  const { data: newData } = process(response.toolCalls);
  return newData;
}
```

## Tool Generation

The adapter automatically generates tools from your schema:

### Field Tools

Each field becomes a `set_<path>` tool:

```typescript
const schema = z.object({
  user: z.object({
    name: z.string(),
    age: z.number(),
  }),
});

// Generated tools:
// - set_user_name(value: string)
// - set_user_age(value: number)
```

### sendMessage Tool

Always available for AI-to-user communication:

```typescript
// AI can call:
sendMessage({ value: "What is your email address?" })
```

## Schema Patterns

### Pagination (Tuples)

Use `z.tuple` to create multi-step flows:

```typescript
const schema = z.tuple([
  z.object({ step1Field: z.string() }),
  z.object({ step2Field: z.string() }),
]);

// AI will collect step1Field before step2Field
```

### Branching (Discriminated Unions)

Use `z.discriminatedUnion` for conditional fields:

```typescript
const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("personal"),
    hobbies: z.string(),
  }),
  z.object({
    type: z.literal("business"),
    company: z.string(),
  }),
]);

// AI will first ask for 'type', then branch accordingly
```

### Optional Fields

```typescript
const schema = z.object({
  name: z.string(),
  nickname: z.string().optional(),  // AI won't require this
});
```

## Integration Examples

### Temporal Workflow

```typescript
import { createStatelessAIForm } from "@hack/form/ai";
import { proxyActivities } from "@temporalio/workflow";

interface Activities {
  callLLM(prompt: string, tools: any, system: string): Promise<any>;
}

const activities = proxyActivities<Activities>();

export async function onboardingWorkflow(userId: string) {
  let data = {};

  while (true) {
    const { state, process } = createStatelessAIForm(schema, data);

    if (state.formState.isComplete) {
      return data;
    }

    const userMessage = await activities.waitForUserMessage(userId);
    const response = await activities.callLLM(
      userMessage,
      toAISDKTools(state.tools),
      state.systemPrompt,
    );

    const result = process(response.toolCalls);
    data = result.data;

    // Send AI messages back to user
    if (result.messages.length > 0) {
      await activities.sendMessageToUser(userId, result.messages[0]);
    }
  }
}
```

### Express API

```typescript
import express from "express";
import { createAIForm } from "@hack/form/ai";

const app = express();
const forms = new Map();

app.post("/form/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  // Get or create form
  let form = forms.get(sessionId);
  if (!form) {
    form = createAIForm(schema);
    forms.set(sessionId, form);
  }

  const state = form.getState();

  // Call AI
  const response = await generateText({
    model: openai("gpt-4"),
    tools: form.getAISDKTools(),
    system: state.systemPrompt,
    prompt: message,
  });

  // Process tools
  for (const toolCall of response.toolCalls) {
    form.executeTool(toolCall.name, toolCall.args);
  }

  res.json({
    message: response.text,
    isComplete: form.isComplete(),
    data: form.isComplete() ? form.getData() : undefined,
  });
});
```

## Advanced Features

### Custom Descriptions

Add descriptions to schema fields for better AI prompting:

```typescript
const schema = z.object({
  email: z.string().email().describe("User's primary email address"),
  age: z.number().min(18).describe("Age in years (must be 18+)"),
});
```

### Validation Errors

The adapter automatically feeds validation errors back to the AI:

```typescript
const form = createAIForm(z.object({
  age: z.number().min(18),
}));

const result = form.executeTool("set_age", { value: 15 });
// result.success = false
// result.message = "Validation failed: Number must be greater than or equal to 18"

// Next AI generation will include this error in the system prompt
```

### Non-Linear Filling

The AI can set future fields if the user provides them:

```typescript
// User says: "I'm Alice and I'm 25 years old"

// AI can call both tools at once:
form.processTools([
  { name: "set_0_name", args: { value: "Alice" } },
  { name: "set_1_age", args: { value: 25 } },
]);
```

## Best Practices

1. **Use descriptions** - Add `.describe()` to your fields for better AI understanding
2. **Structure with tuples** - Use `z.tuple` for clear pagination
3. **Leverage discriminated unions** - For branching logic
4. **Persist state** - In workflows or databases between user interactions
5. **Handle validation errors** - Let the AI retry on validation failures
6. **Use sendMessage** - Encourage AI to communicate clearly with users

## Limitations

- **Arrays**: Dynamic-length arrays (`z.array()`) are not yet supported. Use `z.tuple()` for fixed-length lists.
- **Async validation**: Server-side validation is in development.

## License

MIT
