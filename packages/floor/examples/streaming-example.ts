/**
 * Streaming example showing real-time message consumption
 * Demonstrates:
 * - Agents consuming from both direct mailbox and broadcast bus
 * - Hybrid routing (direct vs broadcast)
 * - Real async message processing
 */

import type { AgentConfig, FloorEvent } from "../src/index";
import { Floor, FloorAgent } from "../src/index";

// Agent that responds to broadcasts matching keywords
class ExpertAgent extends FloorAgent {
	private keywords: string[];

	constructor(config: AgentConfig, keywords: string[]) {
		super(config);
		this.keywords = keywords;
	}

	async processEvent(
		event: FloorEvent,
		history: FloorEvent[],
	): Promise<FloorEvent | null> {
		const content = event.content?.toLowerCase() || "";

		// Always respond to direct messages
		if (event.targetId === this.config.id) {
			console.log(`[${this.config.id}] 📨 Direct message: "${event.content}"`);
			return {
				timestamp: Date.now(),
				type: "replyToAgent",
				actorId: this.config.id,
				targetId: event.actorId,
				content: `Reply from ${this.config.id}: Processed your request`,
			};
		}

		// For broadcasts, check if we have expertise
		const hasExpertise = this.keywords.some((kw) => content.includes(kw));

		if (hasExpertise && event.type === "sendToFloor") {
			console.log(
				`[${this.config.id}] 📢 Broadcast matched! Accepting task: "${event.content}"`,
			);
			return {
				timestamp: Date.now(),
				type: "acceptFromQueue",
				actorId: this.config.id,
				targetId: event.actorId,
				content: `${this.config.id} is handling: ${event.content}`,
			};
		}

		return null;
	}
}

// Phone agent that initiates conversations
class PhoneAgent extends FloorAgent {
	async processEvent(
		event: FloorEvent,
		history: FloorEvent[],
	): Promise<FloorEvent | null> {
		if (event.targetId === this.config.id) {
			console.log(
				`[${this.config.id}] ✅ Received response: "${event.content}"`,
			);
		}
		return null;
	}
}

async function runStreamingExample() {
	console.log("=== Streaming Floor Example ===\n");

	const floor = new Floor();

	// Create agents
	const phone = new PhoneAgent({
		id: "phone",
		systemPrompt: "Phone agent handling customer",
		model: "test",
	});

	const lumberExpert = new ExpertAgent(
		{
			id: "lumber-expert",
			systemPrompt: "Lumber specialist",
			model: "test",
		},
		["wood", "lumber", "timber", "2x4"],
	);

	const designExpert = new ExpertAgent(
		{
			id: "design-expert",
			systemPrompt: "Design specialist",
			model: "test",
		},
		["design", "blueprint", "dimensions", "layout"],
	);

	// Register agents
	floor.registerAgent(phone);
	floor.registerAgent(lumberExpert);
	floor.registerAgent(designExpert);

	// Start agents in background (they'll consume messages as they arrive)
	const agentPromises = [phone, lumberExpert, designExpert].map((agent) =>
		agent.start(async (event) => {
			const response = await agent.processEvent(event, floor.getLog());
			if (response) {
				floor.dispatch(response);
			}
		}),
	);

	// Give agents time to start listening
	await new Promise((resolve) => setTimeout(resolve, 100));

	console.log("--- Scenario 1: Customer asks about wood (Broadcast) ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		content: "Customer needs pricing for wood materials",
	});

	await new Promise((resolve) => setTimeout(resolve, 200));

	console.log("\n--- Scenario 2: Direct question to lumber expert ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		targetId: "lumber-expert",
		content: "What is the price for 2x4 lumber?",
		urgent: true,
	});

	await new Promise((resolve) => setTimeout(resolve, 200));

	console.log("\n--- Scenario 3: Design question (Broadcast) ---");
	floor.dispatch({
		timestamp: Date.now(),
		type: "sendToFloor",
		actorId: "phone",
		content: "Customer wants blueprint dimensions for deck",
	});

	await new Promise((resolve) => setTimeout(resolve, 200));

	console.log("\n--- Event Log Summary ---");
	const log = floor.getLog();
	console.log(`Total events: ${log.length}`);
	console.log("\nEvent breakdown:");

	const eventTypes = log.reduce(
		(acc, e) => {
			acc[e.type] = (acc[e.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	Object.entries(eventTypes).forEach(([type, count]) => {
		console.log(`  ${type}: ${count}`);
	});

	const directMessages = log.filter((e) => e.targetId).length;
	const broadcasts = log.filter((e) => !e.targetId).length;
	console.log(`\nDirect messages: ${directMessages}`);
	console.log(`Broadcasts: ${broadcasts}`);

	await floor.close();
	console.log("\n✓ Example completed");
	process.exit(0); // Force exit since agents are still listening
}

runStreamingExample().catch(console.error);
