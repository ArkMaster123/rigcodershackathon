// Agent exports
export { LLMAgent } from "./agent";
export * from "./agents";
export * from "./types";

// Database and tools exports
export * from "./db";
export { stockTools } from "./db/tools";

// Re-export for convenience
import { Floor, type SimulationEvent } from "@hack/floor";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { LLMAgent } from "./agent";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

const EXAMPLE_DATA_PATH = path.resolve(__dirname, "../../../example.json");

export async function runDemo() {
	console.log("Starting Multi-Agent System...");

	// Load initial data
	const rawData = fs.readFileSync(EXAMPLE_DATA_PATH, "utf-8");
	const initialEvents: SimulationEvent[] = JSON.parse(rawData);

	// Initialize Floor
	const floor = new Floor();

	// Initialize Agents
	const callAgent = new LLMAgent({
		id: "callAgent",
		model: "claude-3-5-sonnet-20241022",
		systemPrompt:
			"You are a Call Agent. You handle direct user interactions. You receive messages from users and decide if you need help from other agents (sendToFloor). You also reply to users based on information you receive.",
	});

	const designAgent = new LLMAgent({
		id: "designAgent",
		model: "claude-3-5-sonnet-20241022",
		systemPrompt:
			"You are a Design Agent. You listen for requests on the floor related to design, dimensions, and materials. You accept tasks from the queue and provide design specifications and pricing estimates.",
	});

	floor.registerAgent(callAgent);
	floor.registerAgent(designAgent);

	// Run Simulation
	console.log("Running simulation...");
	await floor.runSimulation(initialEvents);

	console.log("Simulation complete. Final History:");
	console.log(JSON.stringify(floor.getHistory(), null, 2));
}

// Run if called directly
if (require.main === module) {
	runDemo().catch(console.error);
}
