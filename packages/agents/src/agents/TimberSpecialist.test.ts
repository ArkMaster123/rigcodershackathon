import "@hack/test-utils/test-log";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local in the project root
config({ path: resolve(__dirname, "../../../../.env.local") });

import { describe, expect, test } from "bun:test";
import { TimberSpecialist } from "./TimberSpecialist";
import { LLMAgent } from "../agent";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

describe("TimberSpecialist", () => {
	test("should be an instance of LLMAgent", () => {
		expect(TimberSpecialist).toBeInstanceOf(LLMAgent);
	});

	test("should have correct id", () => {
		expect(TimberSpecialist.config.id).toBe("timberSpecialist");
	});

	test("should have correct model", () => {
		expect(TimberSpecialist.config.model).toBe("openai/gpt-oss-120b");
	});

	test("should have system prompt with timber specialist role", () => {
		expect(TimberSpecialist.config.systemPrompt).toContain("Timber Specialist");
		expect(TimberSpecialist.config.systemPrompt).toContain("wood types");
		expect(TimberSpecialist.config.systemPrompt).toContain("availability");
		expect(TimberSpecialist.config.systemPrompt).toContain("pricing");
	});

	test("system prompt should define expertise areas", () => {
		expect(TimberSpecialist.config.systemPrompt).toContain("availability checks");
		expect(TimberSpecialist.config.systemPrompt).toContain("pricing estimates");
		expect(TimberSpecialist.config.systemPrompt).toContain("Flag constraints");
	});

	test("do some shit", async () => {
		const specialist = TimberSpecialist
		const event = await specialist.processEvent({
			actorId: "user",
			type: "sendToFloor",
			content: "I need pricing for 2x4 lumber",
			timestamp: Date.now(),
		}, [])
	})

	test("should work with openai120b OSS model using Cerebras provider", async () => {
		// Test using providerOptions to specifically route to Cerebras
		const { text } = await generateText({
			model: openrouter("openai/gpt-oss-120b"),
			prompt: "I need pricing for 2x4 lumber. Please provide a brief response.",
			providerOptions: {
				openrouter: {
					provider: {
						only: ["Cerebras"],
					},
				},
			},
		});
		
		expect(text).toBeDefined();
		expect(text.length).toBeGreaterThan(0);
	})
});
