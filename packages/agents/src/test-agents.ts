import { Floor, type SimulationEvent } from "@hack/floor";
import dotenv from "dotenv";
import * as path from "path";
import { AvailabilityScheduler } from "./agents/AvailabilityScheduler";
import { ConversationGuide } from "./agents/ConversationGuide";
import { ProjectArchitect } from "./agents/ProjectArchitect";
import { RiskQA } from "./agents/RiskQA";
import { TimberSpecialist } from "./agents/TimberSpecialist";
import { UpsellCommercial } from "./agents/UpsellCommercial";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../../.env.local") });

async function runTest() {
	console.log("Starting Council Interaction Test...");

	const floor = new Floor(15); // Set a safety limit of 15 steps

	// Register the Council
	floor.registerAgent(ConversationGuide);
	floor.registerAgent(TimberSpecialist);
	floor.registerAgent(ProjectArchitect);
	floor.registerAgent(AvailabilityScheduler);
	floor.registerAgent(UpsellCommercial);
	floor.registerAgent(RiskQA);

	// Initial trigger event: User asks a complex question
	const initialEvent: SimulationEvent = {
		timestamp: Date.now(),
		type: "receiveMessage",
		actorId: "user",
		content:
			"I want to build a massive 4-meter long dining table out of solid Ebony. I need it delivered by next Friday for a party.",
	};

	console.log("Injecting initial user message...");
	await floor.runSimulation([initialEvent]);

	// Simulate the "tick" of the floor to allow agents to react
	// We expect:
	// 1. Timber Specialist to flag Ebony availability/cost/weight.
	// 2. Architect to flag the 4m span issue.
	// 3. Scheduler to flag the "next Friday" timeline.
	// 4. Conversation Guide to synthesize this back to the user.

	for (let i = 0; i < 8; i++) {
		console.log(`--- Step ${i + 1} ---`);
		await floor.processNext();

		// Small delay to avoid rate limits if any
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	console.log("Test complete. Final History:");
	console.log(JSON.stringify(floor.getHistory(), null, 2));
}

runTest().catch(console.error);
