import type { Tool, ToolSet } from "ai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getFlatQuestions } from "../core/flatten";
import { getFieldDescription, pathToToolName } from "./formatters";

export interface AITool {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	path: (string | number)[];
}

/**
 * Generates a flat list of tools from a Zod schema based on the current data state.
 * Only active questions (based on the current data) are exposed as tools.
 *
 * This ensures the AI can only interact with fields that are currently visible/relevant,
 * preventing it from trying to fill in future steps or unselected branches.
 *
 * @param schema - The Zod schema defining the form structure
 * @param data - The current form data (partial)
 * @returns Array of AI tools corresponding to active questions
 */
export function generateTools(
	schema: z.ZodTypeAny,
	data: unknown = {},
): AITool[] {
	const tools: AITool[] = [];

	// Get the list of active questions based on current data
	const activeQuestions = getFlatQuestions(schema, data);

	// Generate a tool for each active question
	for (const question of activeQuestions) {
		// For discriminators, we need to extract the enum values to create a proper schema
		// TODO DOES THIS EXIST?
		if (
			question.type === "discriminator" &&
			question.schema instanceof z.ZodDiscriminatedUnion
		) {
			const discriminator = question.schema.def.discriminator;
			const options = question.schema.def.options.map(
				(opt: z.ZodObject<any>) => {
					const shape = opt.shape || opt._def.shape();
					return shape[discriminator];
				},
			);

			// Create an enum schema for the discriminator
			const discriminatorValues = options.map(
				(opt: z.ZodLiteral<any>) => opt.value,
			);
			const discriminatorSchema = z.enum(
				discriminatorValues as [string, ...string[]],
			);

			tools.push({
				name: pathToToolName(question.path),
				description: getFieldDescription(discriminatorSchema, question.path),
				inputSchema: discriminatorSchema,
				path: question.path,
			});
		} else {
			// Regular leaf field
			tools.push({
				name: pathToToolName(question.path),
				description: getFieldDescription(question.schema, question.path),
				inputSchema: question.schema,
				path: question.path,
			});
		}
	}

	return tools;
}

/**
 * Creates the sendMessage tool definition.
 */
export function createSendMessageTool(): AITool {
	return {
		name: "sendMessage",
		description:
			"Send a message to the user to ask questions or provide feedback",
		inputSchema: z.string(),
		path: [], // Special tool, no path
	};
}

/**
 * Converts AI tools to the format expected by popular AI SDKs (like Vercel AI SDK).
 * This is a convenience function for common SDK formats.
 */
export function toAISDKTools(tools: AITool[]): ToolSet {
	return Object.fromEntries(
		tools.map((tool) => [
			tool.name,
			{
				description: tool.description,
				inputSchema: z.object({ value: tool.inputSchema }),
			} satisfies Tool,
		]),
	);
}
