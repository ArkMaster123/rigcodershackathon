/**
 * LiveKit Voice Agent for @hack/form
 *
 * This module implements the core interaction loop between LiveKit's voice framework
 * and the @hack/form state machine. It handles:
 * - Dynamic tool injection based on current form state
 * - Voice-optimized conversation flow
 * - Validation error recovery
 * - Session state management
 */

import { generateText } from "ai";
import type { z } from "zod";
import { createAIForm } from "../ai";
import {
	generateCompletionMessage,
	generateGreeting,
	generateVoiceSystemPrompt,
} from "./formatters";
import type {
	LiveKitFormAgentConfig,
	LiveKitFormEvents,
	LiveKitFormSession,
} from "./types";

/**
 * Creates a LiveKit form session handler.
 *
 * This is the core state manager that bridges LiveKit events with the @hack/form engine.
 * It maintains conversation history and form state across the session.
 */
export class LiveKitFormAgent<T extends z.ZodTypeAny> {
	private config: LiveKitFormAgentConfig<T>;
	private session: LiveKitFormSession;
	private eventHandlers: Partial<
		Record<keyof LiveKitFormEvents, (data: any) => void>
	> = {};

	constructor(sessionId: string, config: LiveKitFormAgentConfig<T>) {
		this.config = config;
		this.session = {
			sessionId,
			form: createAIForm(config.schema, config.initialData ?? {}),
			messages: [],
			isResume:
				!!config.initialData && Object.keys(config.initialData).length > 0,
			startedAt: new Date(),
		};

		if (this.config.debug) {
			console.log(`[LiveKitFormAgent] Session ${sessionId} initialized`, {
				isResume: this.session.isResume,
				hasInitialData: !!config.initialData,
			});
		}

		this.emit("sessionStarted", {
			sessionId,
			isResume: this.session.isResume,
		});
	}

	/**
	 * Register an event handler
	 */
	public on<K extends keyof LiveKitFormEvents>(
		event: K,
		handler: (data: LiveKitFormEvents[K]) => void,
	): void {
		this.eventHandlers[event] = handler;
	}

	/**
	 * Emit an event to registered handlers
	 */
	private emit<K extends keyof LiveKitFormEvents>(
		event: K,
		data: LiveKitFormEvents[K],
	): void {
		const handler = this.eventHandlers[event];
		if (handler) {
			handler(data);
		}
	}

	/**
	 * Generate the initial greeting message when the session starts.
	 */
	public async getGreeting(): Promise<string> {
		const state = this.session.form.getState();
		return generateGreeting(
			this.session.isResume,
			state.formState.completedSteps,
			state.formState.currentCursor,
		);
	}

	/**
	 * Check if the form is complete
	 */
	public isComplete(): boolean {
		return this.session.form.isComplete();
	}

	/**
	 * Get the current form data
	 */
	public getData(): any {
		return this.session.form.getData();
	}

	/**
	 * Get the current session info
	 */
	public getSession(): Readonly<LiveKitFormSession> {
		return this.session;
	}

	/**
	 * Core interaction loop: Process a user's spoken input.
	 *
	 * This is the heart of the integration. For each turn:
	 * 1. Get current form state
	 * 2. Generate dynamic tools (CRITICAL: only tools for current step)
	 * 3. Create voice-optimized system prompt
	 * 4. Call LLM with tools
	 * 5. Execute tool calls
	 * 6. Handle validation errors conversationally
	 * 7. Return AI's verbal response
	 */
	public async handleUserMessage(userText: string): Promise<string> {
		if (this.config.debug) {
			console.log(`[LiveKitFormAgent] User said: "${userText}"`);
		}

		// Check if form is already complete
		if (this.session.form.isComplete()) {
			return generateCompletionMessage();
		}

		// Add user message to history
		this.session.messages.push({ role: "user", content: userText });

		// Get current form state
		const state = this.session.form.getState();

		// CRITICAL: Get dynamic tools based on CURRENT cursor position
		// This ensures the LLM can only interact with fields that are currently active
		const tools = this.session.form.getAISDKTools();

		// console.log(JSON.stringify(tools));

		if (this.config.debug) {
			console.log(
				`[LiveKitFormAgent] Active tools: ${Object.keys(tools).join(", ")}`,
			);
			console.log(
				`[LiveKitFormAgent] Current cursor: ${state.formState.currentCursor}`,
			);
		}

		// Generate voice-optimized system prompt
		const systemPrompt = generateVoiceSystemPrompt(
			state.formState.currentCursor,
			state.formState.errors,
			state.formState.data,
			state.formState.activeQuestions,
			this.config.voicePersona,
		);

		try {
			// Call LLM with dynamic tools
			const response = await generateText({
				model: this.config.model,
				system: systemPrompt,
				messages: this.session.messages,
				tools,
			});

			if (this.config.debug) {
				console.log(
					`[LiveKitFormAgent] Tool calls: ${response.toolCalls?.length ?? 0}`,
				);
			}

			let assistantMessage;

			// Process tool calls
			if (response.toolCalls && response.toolCalls.length > 0) {
				for (const toolCall of response.toolCalls) {
					const { toolName, input } = toolCall;

					if (this.config.debug) {
						console.log(
							`[LiveKitFormAgent] Executing tool: ${toolName}`,
							input,
						);
					}

					// Execute tool through form adapter
					const result = this.session.form.executeTool(toolName, {
						value: input,
					});

					// Emit tool execution event
					this.emit("toolExecuted", {
						toolName,
						args: input,
						success: result.success,
						message: result.message,
					});

					// Handle validation errors
					if (!result.success && toolName !== "sendMessage") {
						const updatedState = this.session.form.getState();
						const currentField = updatedState.formState.currentCursor;

						if (currentField && updatedState.formState.errors[currentField]) {
							this.emit("validationError", {
								field: currentField,
								errors: updatedState.formState.errors[currentField],
							});
						}

						if (this.config.debug) {
							console.log(`[LiveKitFormAgent] Tool failed: ${result.message}`);
						}
					}

					if (toolName === "sendMessage") {
						assistantMessage = input.value;
					}
				}
			}


			// Add to history
			this.session.messages.push({
				role: "assistant",
				content: assistantMessage,
			});

			// Check if form is now complete
			if (this.session.form.isComplete()) {
				const finalData = this.session.form.getData();
				this.emit("formCompleted", {
					data: finalData,
					sessionId: this.session.sessionId,
				});

				if (this.config.debug) {
					console.log("[LiveKitFormAgent] Form completed!", finalData);
				}

				// Return completion message
				return generateCompletionMessage();
			}

			console.log("ASSISTENT MESSSAGE", assistantMessage, response.text, response.toolCalls);
			if (!assistantMessage) {
				assistantMessage = response.text ?? "Cool!";
			}

			return assistantMessage;
		} catch (error) {
			console.error("[LiveKitFormAgent] Error in handleUserMessage:", error);

			// Return a friendly error message
			return "I'm having trouble processing that. Could you say that again?";
		}
	}

	/**
	 * Update form data externally (e.g., from a web UI sync)
	 */
	public updateData(data: any): void {
		this.session.form.setData(data);

		if (this.config.debug) {
			console.log("[LiveKitFormAgent] Form data updated externally");
		}
	}

	/**
	 * Get conversation history
	 */
	public getMessages(): Array<{ role: "user" | "assistant"; content: string }> {
		return [...this.session.messages];
	}
}

/**
 * Factory function to create a LiveKit form agent.
 * This is the recommended way to instantiate agents.
 */
export function createLiveKitFormAgent<T extends z.ZodTypeAny>(
	sessionId: string,
	config: LiveKitFormAgentConfig<T>,
): LiveKitFormAgent<T> {
	return new LiveKitFormAgent(sessionId, config);
}
