/**
 * Process example.json through the Agent Council
 * 
 * This script takes the example.json input and processes it through all agents,
 * generating a complete event log that can be visualized in the Sales Call Scrubber.
 * 
 * Run with: pnpm tsx src/process-example.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../../../.env.local") });

import type { FloorEvent } from "@hack/floor";
import {
	CallAgent,
	DesignAgent,
	TimberSpecialist,
	AvailabilityScheduler,
	UpsellCommercial,
	ProjectArchitect,
} from "./agents";
import { getPool } from "./db/schema";

interface ProcessedEvent extends FloorEvent {
	toolCalls?: Array<{ toolName: string; args: any }>;
}

async function processExample() {
	console.log("🚀 Starting Agent Council Processing...\n");

	// Read input file (default to wardrobe-example.json, fallback to example.json)
	const inputFile = process.argv[2] || "wardrobe-example.json";
	const examplePath = resolve(__dirname, `../../../${inputFile}`);
	console.log(`📂 Loading: ${inputFile}\n`);
	const exampleData = JSON.parse(readFileSync(examplePath, "utf-8"));
	
	// Find the user message (first receiveMessage)
	const userMessage = exampleData.find((e: any) => e.type === "receiveMessage" && e.actorId === "user");
	
	if (!userMessage) {
		console.error("No user message found in example.json");
		process.exit(1);
	}

	console.log("📝 User Message:", userMessage.content);
	console.log("\n" + "=".repeat(60) + "\n");

	const outputEvents: ProcessedEvent[] = [];
	let currentTimestamp = 0;

	// 1. Add user message
	outputEvents.push({
		timestamp: currentTimestamp,
		type: "receiveMessage",
		actorId: "user",
		content: userMessage.content,
	});

	currentTimestamp += 500;

	// 2. Call Agent processes the user message
	console.log("📞 Call Agent processing user message...");
	const livekitEvent: FloorEvent = {
		timestamp: currentTimestamp,
		type: "receiveMessage",
		actorId: "user",
		content: userMessage.content,
	};

	const callAgentResponse = await CallAgent.processEvent(livekitEvent, [livekitEvent]);
	
	if (callAgentResponse) {
		currentTimestamp += 1000;
		const contentStr = typeof callAgentResponse.content === "string" 
			? callAgentResponse.content 
			: JSON.stringify(callAgentResponse.content);
		
		outputEvents.push({
			timestamp: currentTimestamp,
			type: callAgentResponse.type,
			actorId: "callAgent",
			targetId: callAgentResponse.targetId,
			content: contentStr,
			stateSnapshot: callAgentResponse.stateSnapshot,
			urgent: callAgentResponse.urgent,
			toolCalls: callAgentResponse.stateSnapshot?.toolCalls,
		});
		
		console.log(`   ✓ Call Agent: ${callAgentResponse.type}`);
		console.log(`   Content: ${contentStr.substring(0, 100)}...`);
	}

	// 3. Create broadcast event for specialists
	currentTimestamp += 500;
	const broadcastEvent: FloorEvent = {
		timestamp: currentTimestamp,
		type: "sendToFloor",
		actorId: "callAgent",
		content: `Customer enquiry: ${userMessage.content}`,
		urgent: true,
	};

	outputEvents.push({
		timestamp: currentTimestamp,
		type: "sendToFloor",
		actorId: "callAgent",
		content: broadcastEvent.content as string,
		urgent: true,
	});

	console.log("\n📢 Broadcasting to Floor...\n");

	// 4. Process through specialist agents
	const history = [livekitEvent, callAgentResponse!, broadcastEvent];
	
	const specialists = [
		{ agent: DesignAgent, id: "designAgent", name: "Design Agent" },
		{ agent: TimberSpecialist, id: "timberSpecialist", name: "Timber Specialist" },
		{ agent: AvailabilityScheduler, id: "availabilityScheduler", name: "Availability Scheduler" },
		{ agent: UpsellCommercial, id: "upsellCommercial", name: "Upsell Commercial" },
		{ agent: ProjectArchitect, id: "projectArchitect", name: "Project Architect" },
	];

	// Process all specialists in parallel for faster execution
	const specialistPromises = specialists.map(async ({ agent, id, name }) => {
		console.log(`🔧 ${name} processing...`);
		
		try {
			const response = await agent.processEvent(broadcastEvent, history);
			return { id, name, response };
		} catch (error) {
			console.error(`   ✗ ${name} error:`, error);
			return { id, name, response: null, error };
		}
	});

	const specialistResults = await Promise.all(specialistPromises);

	for (const { id, name, response } of specialistResults) {
		if (response) {
			currentTimestamp += 1500;
			
			// Accept from queue event
			outputEvents.push({
				timestamp: currentTimestamp,
				type: "acceptFromQueue",
				actorId: id,
				stateSnapshot: response.stateSnapshot,
			});

			currentTimestamp += 1000;
			
			const contentStr = typeof response.content === "string" 
				? response.content 
				: JSON.stringify(response.content);

			// Reply event
			outputEvents.push({
				timestamp: currentTimestamp,
				type: response.type || "replyToAgent",
				actorId: id,
				targetId: response.targetId || "callAgent",
				content: contentStr,
				stateSnapshot: response.stateSnapshot,
				toolCalls: response.stateSnapshot?.toolCalls,
			});

			console.log(`   ✓ ${name}: ${response.type}`);
			if (response.stateSnapshot?.toolCalls?.length > 0) {
				console.log(`   🔧 Tool calls: ${response.stateSnapshot.toolCalls.map((tc: any) => tc.toolName).join(", ")}`);
			}
			console.log(`   Content: ${contentStr.substring(0, 80)}...`);
		} else {
			console.log(`   ○ ${name}: NO_ACTION (agent processed but had nothing to add)`);
		}
		
		console.log();
	}

	// 5. Call Agent synthesizes final response
	console.log("📞 Call Agent synthesizing final response...\n");
	
	const specialistResponses = outputEvents.filter(
		(e) => e.type === "replyToAgent" && e.actorId !== "callAgent"
	);

	if (specialistResponses.length > 0) {
		const synthesisEvent: FloorEvent = {
			timestamp: currentTimestamp,
			type: "replyToAgent",
			actorId: "council",
			content: specialistResponses.map(r => `${r.actorId}: ${r.content}`).join("\n"),
		};

		const finalResponse = await CallAgent.processEvent(synthesisEvent, [
			...history,
			...outputEvents.filter(e => e.actorId !== "user"),
		]);

		if (finalResponse && finalResponse.type === "replyToUser") {
			currentTimestamp += 2000;
			
			const contentStr = typeof finalResponse.content === "string" 
				? finalResponse.content 
				: JSON.stringify(finalResponse.content);

			outputEvents.push({
				timestamp: currentTimestamp,
				type: "replyToUser",
				actorId: "callAgent",
				content: contentStr,
				stateSnapshot: finalResponse.stateSnapshot,
			});

			console.log("✓ Final Response to User:");
			console.log(`  ${contentStr.substring(0, 200)}...`);
		}
	}

	// Write output
	const outputPath = resolve(__dirname, "../../../council-output.json");
	writeFileSync(outputPath, JSON.stringify(outputEvents, null, 2));
	
	console.log("\n" + "=".repeat(60));
	console.log(`\n✅ Generated ${outputEvents.length} events`);
	console.log(`📄 Output saved to: council-output.json`);
	console.log("\n💡 Load this file in the Sales Call Scrubber to visualize the agent council!\n");

	// Cleanup
	await getPool().end();
}

processExample().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
