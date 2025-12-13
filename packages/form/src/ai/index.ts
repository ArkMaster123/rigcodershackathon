import { Tool, type ToolSet } from "ai";
import type { z } from "zod";
import {
	type AIFormState,
	executeTool,
	getAIFormState,
	processToolCalls,
	type ToolExecutionResult,
} from "./agent";
import { type AITool, toAISDKTools } from "./tools";

export type { AIFormState, ToolExecutionResult, AITool };

export interface AIFormAdapter {
	/** Get the current form state including tools and system prompt */
	getState: () => AIFormState;

	/** Execute a single tool call */
	executeTool: (toolName: string, args: { value: any }) => ToolExecutionResult;

	/** Process multiple tool calls in sequence */
	processTools: (toolCalls: Array<{ name: string; args: { value: any } }>) => {
		data: any;
		results: ToolExecutionResult[];
		messages: string[];
	};

	/** Get tools in AI SDK format (for Vercel AI SDK, OpenAI, etc.) */
	getAISDKTools: () => ToolSet;

	/** Update the form data (useful after processing external updates) */
	setData: (data: any) => void;

	/** Get the current form data */
	getData: () => any;

	/** Check if the form is complete */
	isComplete: () => boolean;
}

/**
 * Creates an AI Form adapter for a given Zod schema.
 * This is the main entry point for using @hack/form with AI agents.
 *
 * @example
 * ```typescript
 * const form = createAIForm(mySchema);
 *
 * // Get current state
 * const state = form.getState();
 * console.log(state.systemPrompt);
 * console.log(state.tools);
 *
 * // Execute tools
 * const result = form.executeTool("set_name", { value: "Alice" });
 * if (result.success) {
 *   console.log("Updated data:", form.getData());
 * }
 *
 * // Or use with AI SDK
 * import { generateText } from "ai";
 * const response = await generateText({
 *   model: openai("gpt-4"),
 *   tools: form.getAISDKTools(),
 *   system: state.systemPrompt,
 *   prompt: userMessage,
 * });
 * ```
 */
export function createAIForm<T extends z.ZodTypeAny>(
	schema: T,
	initialData: any = {},
): AIFormAdapter {
	let currentData = initialData;
	let messages: string[] = [];

	return {
		getState: () => getAIFormState(schema, currentData, messages),

		executeTool: (toolName: string, args: { value: any }) => {
			const result = executeTool(schema, currentData, toolName, args);

			if (result.success) {
				if (toolName === "sendMessage") {
					messages.push(result.message);
				} else if (result.data !== undefined) {
					currentData = result.data;
				}
			}

			return result;
		},

		processTools: (toolCalls) => {
			const result = processToolCalls(schema, currentData, toolCalls);
			currentData = result.data;
			messages = [...messages, ...result.messages];
			return result;
		},

		getAISDKTools: () => {
			const state = getAIFormState(schema, currentData, messages);
			return toAISDKTools(state.tools);
		},

		setData: (data: any) => {
			currentData = data;
		},

		getData: () => currentData,

		isComplete: () => {
			const state = getAIFormState(schema, currentData, messages);
			return state.formState.isComplete;
		},
	};
}

/**
 * Convenience function for stateless usage.
 * Returns the current state and a process function for handling tool calls.
 *
 * @example
 * ```typescript
 * const { state, process } = createStatelessAIForm(schema, data);
 *
 * // Send to AI
 * const response = await generateText({
 *   model: openai("gpt-4"),
 *   tools: toAISDKTools(state.tools),
 *   system: state.systemPrompt,
 *   prompt: userMessage,
 * });
 *
 * // Process results
 * const { data: newData, results } = process(response.toolCalls);
 *
 * // Persist newData for next turn
 * await saveToDatabase(newData);
 * ```
 */
export function createStatelessAIForm<T extends z.ZodTypeAny>(
	schema: T,
	data: any = {},
) {
	return {
		state: getAIFormState(schema, data),
		process: (toolCalls: Array<{ name: string; args: { value: any } }>) =>
			processToolCalls(schema, data, toolCalls),
	};
}

export {
	executeTool,
	getAIFormState,
	processToolCalls,
} from "./agent";
// Re-export utilities
export {
	generateSystemPrompt,
	pathToToolName,
	toolNameToPath,
} from "./formatters";
export { createSendMessageTool, generateTools, toAISDKTools } from "./tools";
