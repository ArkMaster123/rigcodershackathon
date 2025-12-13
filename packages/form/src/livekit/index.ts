/**
 * @hack/form LiveKit Integration
 *
 * Voice agent adapter for conducting conversational form interviews using LiveKit.
 *
 * @example
 * ```typescript
 * import { createLiveKitFormAgent } from '@hack/form/livekit';
 * import { google } from '@ai-sdk/google';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * const agent = createLiveKitFormAgent('session-123', {
 *   schema,
 *   model: google('gemini-2.5-pro'),
 * });
 *
 * // Get greeting
 * const greeting = agent.getGreeting();
 *
 * // Handle user speech
 * const response = await agent.handleUserMessage('My name is Alice');
 * ```
 */

export { createLiveKitFormAgent, LiveKitFormAgent } from "./agent";
export {
	formatFieldName,
	formatValidationError,
	generateCompletionMessage,
	generateGreeting,
	generateVoiceSystemPrompt,
} from "./formatters";
export type {
	LiveKitFormAgentConfig,
	LiveKitFormEvents,
	LiveKitFormSession,
} from "./types";
