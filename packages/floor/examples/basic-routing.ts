/**
 * Basic example demonstrating Floor's hybrid routing:
 * - Direct messages (with targetId)
 * - Broadcast messages (without targetId)
 */

import type { AgentConfig, FloorEvent } from "../src/index";
import { Floor, FloorAgent } from "../src/index";

// Simple agent that logs received messages
class SimpleAgent extends FloorAgent {
	private messageCount = 0;

	async processEvent(
		event: FloorEvent,
		history: FloorEvent[],
	): Promise<FloorEvent | null> {
		this.messageCount++;
		console.log(`[${this.config.id}] Received message #${this.messageCount}:`, {
			from: event.actorId,
			type: event.type,
			content: event.content,
			isDirect: !!event.targetId,
		});

		// Don't respond to avoid infinite loops in this example
		return null;
	}
}

// Agent that only responds to specific content
class SelectiveAgent extends FloorAgent {
	private keywords: string[];

	constructor(config: AgentConfig, keywords: string[]) {
		super(config);
		this.keywords = keywords;
	}

	async processEvent(
		event: FloorEvent,
		history: FloorEvent[],
	): Promise<FloorEvent | null> {
		// If it's a direct message to me, always process
		if (event.targetId === this.config.id) {
			console.log(
				`[${this.config.id}] Direct message received:`,
				event.content,
			);
			return null;
		}

		// If it's a broadcast, only process if it contains my keywords
		const content = event.content?.toLowerCase() || "";
		const hasKeyword = this.keywords.some((kw) =>
			content.includes(kw.toLowerCase()),
		);

		if (hasKeyword) {
			console.log(
				`[${this.config.id}] Broadcast matched keyword:`,
				event.content,
			);
		} else {
			console.log(`[${this.config.id}] Broadcast ignored (no keyword match)`);
		}

		return null;
	}
}

async function runExample() {
	console.log("=== Floor Hybrid Routing Example ===\n");

	const floor = new Floor();

	// Create agents
	const phoneAgent = new SimpleAgent({
		id: "phone",
		systemPrompt: "Phone agent",
		model: "test",
	});

	const lumberExpert = new SelectiveAgent(
		{
			id: "lumber",
			systemPrompt: "Lumber expert",
			model: "test",
		},
		["wood", "lumber", "timber"],
	);

	const designExpert = new SelectiveAgent(
		{
			id: "design",
			systemPrompt: "Design expert",
			model: "test",
		},
		["design", "blueprint", "dimensions"],
	);

	// Register agents
	console.log("Registering agents...\n");
	floor.registerAgent(phoneAgent);
	floor.registerAgent(lumberExpert);
	floor.registerAgent(designExpert);

	// Start agents (in real implementation, these would run continuously)
	// For this example, we'll just dispatch events and let the agents process them synchronously

	console.log("--- Test 1: Broadcast Message (no targetId) ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		content: "I need help with wood pricing",
		urgent: false,
	});

	console.log("\n--- Test 2: Direct Message (with targetId) ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		targetId: "lumber",
		content: "Please quote 2x4 lumber",
		urgent: true,
	});

	console.log("\n--- Test 3: Broadcast ignored by lumber expert ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		content: "I need design help with dimensions",
		urgent: false,
	});

	console.log("\n--- Test 4: Direct to non-existent agent ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		targetId: "nonexistent",
		content: "This should be dropped",
		urgent: false,
	});

	console.log("\n--- Event Log ---");
	console.log(`Total events logged: ${floor.getLog().length}`);

	// Cleanup
	await floor.close();
	console.log("\nFloor closed successfully.");
}

// Run the example
runExample().catch(console.error);
