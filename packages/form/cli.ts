#!/usr/bin/env bun

/**
 * AI Form CLI Tester
 *
 * Interactive REPL for testing @hack/form AI adapter with Google Gemini.
 * Tests discriminated unions, nested fields, and tool calling behavior.
 */

import * as readline from "node:readline/promises";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";
import { createAIForm } from "./src/ai";

// Test schema with discriminated union for branching logic
const schema = z.object({
	firstName: z.string().describe("User's first name"),
	lastName: z.string().describe("User's last name"),
	age: z.number().min(0).describe("User's age in years"),
	address: z
		.discriminatedUnion("type", [
			z.object({
				type: z.literal("house").describe("Detached house or bungalow"),
			}),
			z.object({
				type: z.literal("flat").describe("Apartment or flat"),
				floor: z.number().describe("The floor number (0 for ground floor)"),
			}),
		])
		.describe("User's address details"),
});

async function main() {
	// Check for API key
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		console.error(
			"\x1b[31mError: GEMINI_API_KEY environment variable not set\x1b[0m",
		);
		console.log("Please set your API key:");
		console.log("  export GEMINI_API_KEY='your-key-here'");
		process.exit(1);
	}

	// Initialize form
	const form = createAIForm(schema);

	// Conversation history
	const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

	// Setup readline interface
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log("\x1b[35m╔════════════════════════════════════════════╗\x1b[0m");
	console.log("\x1b[35m║   AI Form CLI Tester - Gemini Edition   ║\x1b[0m");
	console.log("\x1b[35m╚════════════════════════════════════════════╝\x1b[0m");
	console.log("");
	console.log("This is an interactive test of the @hack/form AI adapter.");
	console.log("Chat naturally to fill out the form. Type 'exit' to quit.\n");

	// Main REPL loop
	while (!form.isComplete()) {
		try {
			// Get user input
			const userInput = await rl.question("\x1b[33mYou:\x1b[0m ");

			if (userInput.toLowerCase() === "exit") {
				console.log("\nExiting...");
				rl.close();
				process.exit(0);
			}

			if (!userInput.trim()) {
				continue;
			}

			// Add user message to history
			messages.push({ role: "user", content: userInput });

			// Get current form state
			const state = form.getState();

			// Generate AI response
			console.log("\x1b[90m[Thinking...]\x1b[0m");

			const tools = form.getAISDKTools();

			const model = google("gemini-2.5-pro");

			const response = await generateText({
				model: model,
				system: state.systemPrompt,
				messages,
				tools,
			});

			// Process tool calls if any
			if (response.toolCalls && response.toolCalls.length > 0) {
				console.log("\x1b[36m🔧 Tool Calls:\x1b[0m");

				for (const toolCall of response.toolCalls) {
					const { toolName, input } = toolCall;

					// Pretty print tool call
					console.log(
						`   \x1b[36m→ ${toolName}\x1b[0m(\x1b[90m${JSON.stringify(input)}\x1b[0m)`,
					);

					// Execute tool
					const result = form.executeTool(toolName, { value: input });

					if (!result.success) {
						console.log(`   \x1b[31m✗ ${result.message}\x1b[0m`);
					} else if (toolName !== "sendMessage") {
						console.log(`   \x1b[32m✓ ${result.message}\x1b[0m`);
					}
				}

				console.log("");
			}

			// Display AI response text
			if (response.text) {
				console.log(`\x1b[32mAI:\x1b[0m ${response.text}\n`);
				messages.push({ role: "assistant", content: response.text });
			}

			// Show progress
			const updatedState = form.getState();
			console.log(
				`\x1b[90m[Progress: ${updatedState.formState.completedSteps.length} fields completed]\x1b[0m\n`,
			);
		} catch (error) {
			console.error("\x1b[31mError:\x1b[0m", error);
			console.log("Continuing...\n");
		}
	}

	// Form completed!
	console.log("\x1b[35m╔════════════════════════════════════════════╗\x1b[0m");
	console.log("\x1b[35m║          Form Completed! 🎉              ║\x1b[0m");
	console.log(
		"\x1b[35m╚════════════════════════════════════════════╝\x1b[0m\n",
	);

	const finalData = form.getData();
	console.log("\x1b[32mFinal Data:\x1b[0m");
	console.log(JSON.stringify(finalData, null, 2));
	console.log("");

	rl.close();
}

// Run the CLI
main().catch((error) => {
	console.error("\x1b[31mFatal Error:\x1b[0m", error);
	process.exit(1);
});
