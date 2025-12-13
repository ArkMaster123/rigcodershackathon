/**
 * LiveKit Integration Types for @hack/form
 *
 * Defines the interfaces and types used by the LiveKit voice agent adapter.
 */

import type { z } from "zod";
import type { AIFormAdapter } from "../ai";

/**
 * Configuration for the LiveKit form agent
 */
export interface LiveKitFormAgentConfig<T extends z.ZodTypeAny = z.ZodTypeAny> {
	/** The Zod schema defining the form structure */
	schema: T;

	/** Initial form data (for resuming conversations) */
	initialData?: any;

	/** LLM model instance from AI SDK (e.g., google('gemini-2.5-pro')) */
	model: any;

	/** Custom greeting message for first-time users */
	welcomeMessage?: string;

	/** Custom greeting message for returning users */
	resumeMessage?: string;

	/** Enable debug logging */
	debug?: boolean;

	/** Custom voice-specific system prompt modifications */
	voicePersona?: string;
}

/**
 * Session state for a LiveKit form agent
 */
export interface LiveKitFormSession {
	/** Unique session ID */
	sessionId: string;

	/** The form adapter instance */
	form: AIFormAdapter;

	/** Conversation message history */
	messages: Array<{ role: "user" | "assistant"; content: string }>;

	/** Whether this is a resumed session */
	isResume: boolean;

	/** Session start time */
	startedAt: Date;
}

/**
 * Events emitted by the LiveKit form agent
 */
export interface LiveKitFormEvents {
	/** Emitted when a tool is executed */
	toolExecuted: {
		toolName: string;
		args: any;
		success: boolean;
		message: string;
	};

	/** Emitted when a validation error occurs */
	validationError: {
		field: string;
		errors: string[];
	};

	/** Emitted when the form is completed */
	formCompleted: {
		data: any;
		sessionId: string;
	};

	/** Emitted when the session starts */
	sessionStarted: {
		sessionId: string;
		isResume: boolean;
	};
}
