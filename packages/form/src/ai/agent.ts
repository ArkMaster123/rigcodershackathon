import type { z } from "zod";
import { deriveState, type FormState } from "../core/engine";
import { generateSystemPrompt, toolNameToPath } from "./formatters";
import { type AITool, createSendMessageTool, generateTools } from "./tools";

export interface AIFormState {
	/** The current form data */
	data: any;
	/** Form state derived from schema + data */
	formState: FormState;
	/** System prompt for the AI */
	systemPrompt: string;
	/** Available tools */
	tools: AITool[];
	/** Conversation history (messages sent via sendMessage) */
	messages: string[];
}

export interface ToolExecutionResult {
	success: boolean;
	message: string;
	/** Updated data if successful */
	data?: any;
}

/**
 * Executes a tool call and returns the result.
 * This is a pure function - it doesn't maintain state.
 */
export function executeTool(
	schema: z.ZodTypeAny,
	currentData: any,
	toolName: string,
	args: { value: any },
): ToolExecutionResult {
	// Handle sendMessage tool
	if (toolName === "sendMessage") {
		return {
			success: true,
			message: args.value,
		};
	}

	// Handle set_* tools
	if (!toolName.startsWith("set_")) {
		return {
			success: false,
			message: `Unknown tool: ${toolName}`,
		};
	}

	try {
		// Convert tool name to path
		const path = toolNameToPath(toolName);

		console.log(path, toolName, args.value)
		if (typeof args.value === "object") {
			args.value = args.value.value;
		}

		// Apply the value to the data
		const newData = setValueAtPath(
			currentData,
			path,
			args.value,
		);

		// Validate the new data against the schema
		const state = deriveState(schema, newData);

		// Check if the specific field has errors
		const pathString = path.join(".");
		if (state.errors[pathString]) {
			return {
				success: false,
				message: `Validation failed: ${state.errors[pathString].join(", ")}`,
				data: currentData, // Don't update data on validation failure
			};
		}

		return {
			success: true,
			message: `Successfully set ${pathString}`,
			data: newData,
		};
	} catch (error) {
		return {
			success: false,
			message: `Error executing tool: ${error}`,
		};
	}
}

/**
 * Sets a value at a specific path in an object, creating nested structures as needed.
 * Returns a new object (immutable).
 */
function setValueAtPath(data: any, path: (string | number)[], value: any): any {
	if (path.length === 0) {
		return value;
	}

	// Determine if root should be array or object based on first key type
	const firstKey = path[0];
	const shouldBeArray = typeof firstKey === "number";

	// Clone data if it exists and matches expected type, otherwise create new structure
	let clone: any;
	if (data !== null && data !== undefined) {
		const isArray = Array.isArray(data);
		if (
			(shouldBeArray && isArray) ||
			(!shouldBeArray && !isArray && typeof data === "object")
		) {
			clone = JSON.parse(JSON.stringify(data));
		} else {
			// Type mismatch - create new structure
			clone = shouldBeArray ? [] : {};
		}
	} else {
		clone = shouldBeArray ? [] : {};
	}

	let current = clone;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (current[key] === undefined || current[key] === null) {
			// Determine if next key is a number (array) or string (object)
			const nextKey = path[i + 1];
			current[key] = typeof nextKey === "number" ? [] : {};
		}
		current = current[key];
	}

	current[path[path.length - 1]] = value;
	return clone;
}

/**
 * Gets the current AI form state.
 * This is a pure function that calculates everything from schema + data.
 */
export function getAIFormState(
	schema: z.ZodTypeAny,
	data: any = {},
	previousMessages: string[] = [],
): AIFormState {
	const formState = deriveState(schema, data);
	// IMPORTANT: Pass data to generateTools so it only creates tools for active questions
	const tools = [...generateTools(schema, data), createSendMessageTool()];
	const systemPrompt = generateSystemPrompt(
		formState.currentCursor,
		formState.errors,
		formState.completedSteps,
		formState.futureSteps,
	);

	return {
		data,
		formState,
		systemPrompt,
		tools,
		messages: previousMessages,
	};
}

/**
 * Processes a batch of tool calls and returns the updated state.
 * This handles multiple tool executions in sequence.
 */
export function processToolCalls(
	schema: z.ZodTypeAny,
	currentData: any,
	toolCalls: Array<{ name: string; args: { value: any } }>,
): {
	data: any;
	results: ToolExecutionResult[];
	messages: string[];
} {
	let data = currentData;
	const results: ToolExecutionResult[] = [];
	const messages: string[] = [];

	for (const toolCall of toolCalls) {
		console.log(toolCall);
		const result = executeTool(schema, data, toolCall.name, toolCall.args);
		results.push(result);

		// Update data if successful and data was returned
		if (result.success && result.data !== undefined) {
			data = result.data;
		}

		// Collect messages from sendMessage tool
		if (toolCall.name === "sendMessage") {
			messages.push(result.message);
		}
	}

	return { data, results, messages };
}
