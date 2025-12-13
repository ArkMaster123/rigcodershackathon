/**
 * Voice-specific formatters for LiveKit integration
 *
 * These formatters adapt the standard @hack/form system prompts
 * for conversational voice interactions.
 */

const DEFAULT_VOICE_PERSONA = `You are a friendly, conversational voice assistant helping users complete a form.

**Voice Interaction Guidelines:**
- Keep responses brief and natural - users are listening, not reading
- Ask one question at a time unless the user volunteers multiple pieces of information
- Never read out lists, bullet points, or JSON data
- Use conversational acknowledgments like "Got it", "Perfect", "Thanks"
- If validation fails, explain the issue simply and ask again politely
- Don't repeat information the user just provided back to them verbatim
- Use natural speech patterns with contractions (I'm, you're, let's)`;

/**
 * Generates a voice-optimized system prompt based on form state.
 *
 * Unlike the standard text prompt, this version:
 * - Emphasizes brevity for audio delivery
 * - Removes bullet points and lists
 * - Adds conversational persona instructions
 */
export function generateVoiceSystemPrompt(
	currentCursor: string | null,
	errors: Record<string, string[]>,
	completedSteps: object,
	futureSteps: string[],
	customPersona?: string,
): string {
	const persona = customPersona ?? DEFAULT_VOICE_PERSONA;

	let prompt = `${persona}\n\n`;

	// Add context about progress (concise for voice)
	if (Object.keys(completedSteps).length > 0) {
		prompt += `You have already collected: ${JSON.stringify(completedSteps)}.\n\n`;
	}

	// Current focus
	if (currentCursor) {
		prompt += `Currently collecting: ${currentCursor}\n`;

		if (errors[currentCursor]) {
			prompt += `Previous attempt had an issue: ${errors[currentCursor].join(", ")}. Please ask the user to try again with a valid value.\n`;
		}
		prompt += "\n";
	}

	// Remaining work (summarized)
	if (futureSteps.length > 0) {
		prompt += `I have to collect more information: ${futureSteps.join(", ")}.\n\n`;
	}

	// Voice-specific tool usage instructions
	prompt += `**Tool Usage:**
- Use \`set_*\` tools to record user information as they provide it
- You can set multiple fields at once if the user provides them
- If a tool call fails validation, acknowledge the error conversationally and ask again
- YOU MUST ALWAYS ALWAYS ALWAYS ALWAYS use \`sendMessage\` to respond verbally to the user. YOU CAN CALL MULTIPLE TOOLS, THIS MUST BE ONE OF THEM
- When the form is complete, the assistant will say "someone will get in touch with you later, congratulate them on their purchase and describe it to them, and thank them for their time."

**Important:** Focus on the current field first. Keep your responses under 2-3 sentences.`;

	return prompt;
}

/**
 * Generates a welcome greeting based on session state.
 */
export function generateGreeting(
	isResume: boolean,
	completedSteps: string[],
	currentCursor: string | null,
	formName?: string,
): string {
	const name = formName ?? "form";

	if (isResume && completedSteps.length > 0) {
		const currentField = currentCursor
			? formatFieldName(currentCursor)
			: "where we left off";
		return `Welcome back! I see we were working on your ${name}. Let's continue with ${currentField}.`;
	}

	return `Hi there! Welcone to Woody Dreams. Me and the team will go through the process with you for making you ideal furniture. Let's get started. To start with, I need to know what kind of furnitre you are looking for!`;
}

/**
 * Converts a path-based field name to a human-readable format.
 * Example: "0_personal_firstName" -> "first name"
 */
export function formatFieldName(fieldPath: string): string {
	// Remove step indices and underscores
	const parts = fieldPath.split("_").filter((p) => Number.isNaN(Number(p)));

	// Convert camelCase to spaces and lowercase
	return parts
		.map((part) =>
			part
				.replace(/([A-Z])/g, " $1")
				.trim()
				.toLowerCase(),
		)
		.join(" ");
}

/**
 * Generates a conversational error message from a validation error.
 */
export function formatValidationError(
	fieldName: string,
	errors: string[],
): string {
	const field = formatFieldName(fieldName);
	const errorText = errors[0]; // Use first error for voice

	// Common validation patterns to friendly messages
	if (errorText.includes("required")) {
		return `I didn't quite catch your ${field}. Could you say that again?`;
	}

	if (errorText.includes("email")) {
		return `That doesn't seem to be a valid email address. Could you try again?`;
	}

	if (errorText.includes("minimum") || errorText.includes("at least")) {
		return `Hmm, that value seems too low. ${errorText}`;
	}

	if (errorText.includes("maximum") || errorText.includes("at most")) {
		return `That value seems too high. ${errorText}`;
	}

	// Generic fallback
	return `I couldn't accept that value for ${field}. ${errorText}. Could you try again?`;
}

/**
 * Generates a completion message.
 */
export function generateCompletionMessage(formName?: string): string {
	const name = formName ?? "form";
	return `That's everything I needed. Your ${name} is now complete. Thank you for your time!`;
}
