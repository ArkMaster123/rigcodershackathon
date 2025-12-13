#!/usr/bin/env node

/**
 * LiveKit Voice Form Agent Example
 *
 * This example demonstrates a complete LiveKit agent that uses @hack/form
 * to conduct voice interviews for data collection.
 *
 * NOTE: This is reference code. To use it, you'll need to install:
 *   npm install @livekit/agents @livekit/agents-plugin-silero @livekit/agents-plugin-deepgram @livekit/agents-plugin-openai
 *
 * Prerequisites:
 * - LIVEKIT_URL: Your LiveKit server URL
 * - LIVEKIT_API_KEY: Your LiveKit API key
 * - LIVEKIT_API_SECRET: Your LiveKit API secret
 * - GEMINI_API_KEY: Your Google Gemini API key
 * - DEEPGRAM_API_KEY: Your Deepgram API key (for STT)
 * - OPENAI_API_KEY: Your OpenAI API key (for TTS)
 *
 * Usage:
 *   bun run examples/livekit-agent/worker.ts
 */

import { Floor } from "@hack/floor";
import { createLiveKitFormAgent } from "@hack/form/livekit";
import {
	cli,
	defineAgent,
	type JobContext,
	llm,
	ServerOptions,
	voice,
} from "@livekit/agents";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as openai from "@livekit/agents-plugin-openai";
import { google } from "@ai-sdk/google"
import * as silero from "@livekit/agents-plugin-silero";
import { z } from "zod";
import { writeFileSync } from "fs";

const floor = new Floor();

// Define the form schema for address collection
const addressSchema = z.object({
	whatYouWant: z.string(),
	postCode: z.string(),
	woodType: z.discriminatedUnion("type", [
		z.object({
			type: z.literal("instock"),
			variety: z.enum(["oak", "maple", "cherry"]),
		}),
		z.object({
			type: z.literal("onOrder"),
			variety: z.enum(["mahogany", "walnut"]),
		}),
	]),
	designDescription: z.string().meta({
		description:
			"Please describe the design in detail. Please get a confirmation from the design agent that this is feasible before accepting this.",
	}),
	consultationDate: z.date().meta({
		description:
			"Please get possible dates from the consultation agent before accepting this.",
	}),
	price: z.number().meta({
		description:
			"Please get a confirmation from the price agent before accepting this in GBP.",
	}),
	deliveryDate: z.date().meta({
		description:
			"Please get possible dates from the delivery agent before accepting this.",
	}),
	phoneNumber: z.string().meta({
		description: "Please get a phone number, make sure it is a UK number.",
	}),
}).describe("when the user finishes, say someone will get in touch with them later.");

// dummy model, is not used
class AnthropicModel extends llm.LLM {
	label(): string {
		return "anthropic-claude-4.5";
	}
	chat(): llm.LLMStream {
		throw new Error("Method not implemented.");
	}
}

/**
 * Custom Voice Agent that integrates @hack/form with LiveKit's voice pipeline.
 *
 * This agent intercepts the conversation loop to route user speech through
 * the form validation engine before generating responses.
 */
class FormVoiceAgent extends voice.Agent {
	private formAgent: ReturnType<typeof createLiveKitFormAgent>;
	private ctx: JobContext;
	private tid = new Date().getTime();

	constructor(
		formAgent: ReturnType<typeof createLiveKitFormAgent>,
		ctx: JobContext,
		private floor: Floor,
	) {
		super({
			// Instructions are handled dynamically by the form agent
			instructions: "",
		});
		this.formAgent = formAgent;
		this.ctx = ctx;
	}



	// Hook: Called when the agent connects to the session
	async onEnter() {
		console.log("[FormVoiceAgent] Session started");

		// Get the greeting from the form state
		const greeting = await this.formAgent.getGreeting();

		// Speak the greeting using TTS
		await this.session.say(greeting);
	}

	// Hook: Called when user speech is committed (replaces default LLM call)
	async onUserTurnCompleted(chatCtx: any, message: any) {
		const userText = message.textContent;
		if (!userText?.trim()) {
			return;
		}

		floor.dispatch({
			timestamp: Date.now(),
			type: "sendToFloor",
			actorId: "user",
			content: userText,
			urgent: false,
		});

		console.log(`[FormVoiceAgent] User said: "${userText}"`);

		let response;
		try {

			// Process text through Form Agent (validates & updates state)
			response = await this.formAgent.handleUserMessage(userText);
		} catch (error) {
			console.error("[FormVoiceAgent] Error:", error);
			return;
		}

		let handle;
		try {
			// Speak the response
			console.log("[FormVoiceAgent] Speaking response:", response);
			handle = this.session.say(response);
		} catch (error) {
			console.error("[FormVoiceAgent] Error:", error);
			return;
		}

		// Check for completion
		if (this.formAgent.isComplete()) {
			console.log("[FormVoiceAgent] Form complete!", this.formAgent.getData());
			// write the events from the floor to a file


			if (handle) {
				await handle.waitForPlayout();
			}

			this.ctx.shutdown();
		}

		try {
			writeFileSync(
				`./floor-test-${this.tid}.json`,
				JSON.stringify(this.floor.getLog(), null, 2)
			);
		} catch (error) {
			console.error("[FormVoiceAgent] Error:", error);
		}
	}
}

/**
 * Define the agent using the new voice API.
 *
 * The defineAgent pattern includes:
 * - prewarm: Called once when the worker starts (preload models)
 * - entry: Called for each new job/session
 */
export default defineAgent({
	// Preload VAD model for faster startup
	prewarm: async (proc) => {
		console.log("[Worker] Prewarming VAD model...");
		proc.userData.vad = await silero.VAD.load();
		console.log("[Worker] VAD model ready");
	},

	// Entry point for each new session
	entry: async (ctx) => {
		const sessionId = ctx._sessionDirectory;
		console.log(`[Worker] Starting session ${sessionId}`);

		await ctx.connect();

		// 1. Initialize the Form Logic Engine
		const formAgent = createLiveKitFormAgent(sessionId, {
			schema: addressSchema,
			model: google("gemini-flash-latest"),
			debug: true,
		});

		// Setup event handlers
		formAgent.on("formCompleted", ({ data }) => {
			console.log("[Worker] Form completed successfully!", data);
			// In production: Save to database, trigger Temporal workflow, etc.
		});

		formAgent.on("validationError", ({ field, errors }) => {
			console.log(`[Worker] Validation error on ${field}:`, errors);
		});

		console.log(ctx.proc.userData);

		// 2. Configure Voice Pipeline
		// Note: You can swap these for other providers (ElevenLabs, Google, etc.)
		const session = new voice.AgentSession({
			vad: ctx.proc.userData.vad,
			stt: new openai.STT({
				apiKey: process.env.OPENAI_API_KEY!,
			}),
			tts: new elevenlabs.TTS({
				apiKey: process.env.ELEVENLABS_API_KEY!,
				voice: {
					id: "FndQGcP7Rm2cqYqsVoWt",
					name: "Brian",
					category: "General",
				}
			}),
			llm: new AnthropicModel(),
		});

		// 3. Create and start the custom agent
		const agent = new FormVoiceAgent(formAgent, ctx, floor);

		try {
			await Promise.race([
				session.start({
					agent,
					room: ctx.room,
				}),
				floor.run()
			]);
		} catch (e) {
			console.error("[Worker] Error:", e);
		}

		console.log(`[Worker] Session ${sessionId} started successfully`);
	},
});

cli.runApp(new ServerOptions({ agent: import.meta.filename }));
