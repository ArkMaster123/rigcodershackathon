/**
 * @hack/form/ai
 *
 * AI adapter for @hack/form - enables LLMs to drive form flows.
 * Import from '@hack/form/ai' to use this adapter.
 *
 * @example
 * ```typescript
 * import { createAIForm } from '@hack/form/ai';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 *
 * const form = createAIForm(schema);
 * const state = form.getState();
 *
 * // Use with AI SDK
 * const response = await generateText({
 *   model: openai('gpt-4'),
 *   tools: form.getAISDKTools(),
 *   system: state.systemPrompt,
 * });
 * ```
 */

export * from "./src/ai/index";
