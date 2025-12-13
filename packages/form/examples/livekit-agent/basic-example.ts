#!/usr/bin/env bun
/**
 * Basic LiveKit Form Agent Example
 *
 * This simplified example demonstrates the core @hack/form LiveKit integration
 * without the full LiveKit Agents framework setup.
 *
 * This is useful for:
 * - Understanding the core concepts
 * - Testing the form agent locally
 * - Building custom integrations
 *
 * Usage:
 *   GEMINI_API_KEY=your-key bun run examples/livekit-agent/basic-example.ts
 */

import * as readline from "node:readline/promises";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createLiveKitFormAgent } from "../../src/livekit";

// Define a simple form schema
const schema = z.object({
	name: z.string().describe("User's full name"),
	email: z.string().email().describe("Email address"),
	propertyType: z
		.discriminatedUnion("type", [
			z.object({
				type: z.literal("house").describe("House or bungalow"),
				garden: z.boolean().describe("Has a garden"),
			}),
			z.object({
				type: z.literal("flat").describe("Apartment or flat"),
				floor: z.number().describe("Floor number"),
			}),
		])
		.describe("Property information"),
});

async function main() {
	// Check for API key
	if (!process.env.GEMINI_API_KEY) {
		console.error("❌ GEMINI_API_KEY environment variable not set");
		process.exit(1);
	}

	console.log("╔═══════════════════════════════════════════╗");
	console.log("║  LiveKit Form Agent - Basic Example     ║");
	console.log("╚═══════════════════════════════════════════╝\n");

	// Create the form agent
	const agent = createLiveKitFormAgent("demo-session", {
		schema,
		model: google("gemini-2.5-pro"),
		debug: true,
	});

	// Setup event handlers
	agent.on("toolExecuted", ({ toolName, success, message }) => {
		const icon = success ? "✓" : "✗";
		console.log(`  ${icon} ${toolName}: ${message}`);
	});

	agent.on("formCompleted", ({ data }) => {
		console.log("\n🎉 Form completed!");
		console.log(JSON.stringify(data, null, 2));
	});

	agent.on("validationError", ({ field, errors }) => {
		console.log(`  ⚠️  Validation error on ${field}: ${errors.join(", ")}`);
	});

	// Setup readline interface
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	// Speak the greeting (in a real voice agent, this would be TTS)
	const greeting = agent.getGreeting();
	console.log(`\n🤖 Agent: ${greeting}\n`);

	// Main conversation loop
	while (!agent.isComplete()) {
		try {
			const userInput = await rl.question("🎤 You: ");

			if (userInput.toLowerCase() === "exit") {
				console.log("\nExiting...");
				break;
			}

			if (!userInput.trim()) {
				continue;
			}

			console.log(""); // Blank line for readability

			// Process user input through the agent
			const response = await agent.handleUserMessage(userInput);

			// Speak the response (in a real voice agent, this would be TTS)
			console.log(`\n🤖 Agent: ${response}\n`);

			// Show progress
			const state = agent.getSession().form.getState();
			const progress = state.formState.completedSteps.length;
			const total =
				progress +
				state.formState.futureSteps.length +
				(state.formState.currentCursor ? 1 : 0);
			console.log(`[Progress: ${progress}/${total} fields]\n`);
		} catch (error) {
			console.error("❌ Error:", error);
		}
	}

	if (agent.isComplete()) {
		console.log("\n╔═══════════════════════════════════════════╗");
		console.log("║          Form Completed! 🎉              ║");
		console.log("╚═══════════════════════════════════════════╝\n");

		console.log("Final Data:");
		console.log(JSON.stringify(agent.getData(), null, 2));
	}

	rl.close();
}

main().catch(console.error);
