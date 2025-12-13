import type { z } from "zod";

/**
 * Sanitizes a path array into a valid tool name.
 * Example: ["0", "personal", "age"] -> "set_0_personal_age"
 */
export function pathToToolName(path: (string | number)[]): string {
	return `set_${path.join("_")}`;
}

/**
 * Converts a tool name back to a path array.
 * Example: "set_0_personal_age" -> ["0", "personal", "age"]
 */
export function toolNameToPath(toolName: string): (string | number)[] {
	if (!toolName.startsWith("set_")) {
		throw new Error(`Invalid tool name: ${toolName}`);
	}

	const pathString = toolName.slice(4); // Remove "set_" prefix
	return pathString.split("_").map((segment) => {
		// Try to parse as number, otherwise keep as string
		const num = Number(segment);
		return Number.isNaN(num) ? segment : num;
	});
}

/**
 * Generates a human-readable field name from a path.
 * Example: ["0", "personal", "age"] -> "Step 0 - Personal - Age"
 */
export function pathToReadableName(path: (string | number)[]): string {
	return path
		.map((segment) => {
			if (typeof segment === "number") {
				return `Step ${segment}`;
			}
			// Convert camelCase to Title Case
			return segment
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (str) => str.toUpperCase())
				.trim();
		})
		.join(" - ");
}

/**
 * Extracts description from schema metadata or generates a default one.
 */
export function getFieldDescription(
	schema: z.ZodTypeAny,
	path: (string | number)[],
): string {
	const meta = schema.description;
	if (meta) {
		return meta;
	}

	// Generate default description
	const fieldName = pathToReadableName(path);
	return `Set the value for: ${fieldName}`;
}

/**
 * Generates a system prompt based on the current form state.
 */
export function generateSystemPrompt(
	currentCursor: string | null,
	errors: Record<string, string[]>,
	completedSteps: string[],
	futureSteps: string[],
): string {
	let prompt =
		"You are a helpful assistant conducting an interview to collect structured data. You must reply to the user asking follow up questions to take them through the flow.\n\n";

	if (completedSteps.length > 0) {
		prompt += `**Completed fields:**\n${completedSteps.map((s) => `- ${s}`).join("\n")}\n\n`;
	}

	if (currentCursor) {
		prompt += `**Current field:** ${currentCursor}\n`;

		if (errors[currentCursor]) {
			prompt += `**Validation errors:** ${errors[currentCursor].join(", ")}\n`;
		}

		prompt += "\n";
	}

	if (futureSteps.length > 0) {
		prompt += `**Remaining fields:**\n${futureSteps.map((s) => `- ${s}`).join("\n")}\n\n`;
	}

	prompt += "**Instructions:**\n";
	prompt += "- Use the available `set_*` tools to record user information.\n";
	prompt +=
		"- You can set multiple fields at once if the user provides multiple pieces of information.\n";
	prompt +=
		"- If validation fails, use `sendMessage` to ask the user to correct their input.\n";
	prompt +=
		"- Use `sendMessage` to ask clarifying questions or acknowledge successful input.\n";
	prompt +=
		"- Focus on collecting the current field first, but if the user volunteers future information, record it.\n";

	return prompt;
}
