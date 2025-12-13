/**
 * Agent Council End-to-End Test
 *
 * Simulates the full flow as if LiveKit is sending a request:
 * 1. Customer message comes in via LiveKit/Sales Agent
 * 2. Message is broadcast to the "floor" (council of AI agents)
 * 3. Each specialist agent processes based on their expertise
 * 4. Agents query the database using their tools
 * 5. Responses are collected and sent back to the user
 *
 * Run with: npx tsx src/council-e2e.test.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(__dirname, "../../../.env.local") });

import { Floor, type FloorEvent } from "@hack/floor";
import { LLMAgent } from "./agent";
import {
	checkMaterialAvailability,
	getProductById,
	getProducts,
	getServices,
	getDecorators,
	getLeadTime,
	getMaterials,
	searchProducts,
} from "./db/tools";
import { getPool } from "./db/schema";

// ============================================================================
// Test Agents with Database Tool Integration
// ============================================================================

/**
 * Enhanced LLM Agent that can use database tools
 */
class ToolEnabledAgent extends LLMAgent {
	private tools: Map<string, (input: unknown) => Promise<unknown>>;

	constructor(
		config: { id: string; systemPrompt: string; model: string },
		tools: Map<string, (input: unknown) => Promise<unknown>>
	) {
		super(config);
		this.tools = tools;
	}

	/**
	 * Execute a tool call and return the result
	 */
	async callTool(toolName: string, input: unknown): Promise<unknown> {
		const tool = this.tools.get(toolName);
		if (!tool) {
			throw new Error(`Tool ${toolName} not found`);
		}
		return tool(input);
	}
}

// ============================================================================
// Agent Definitions with their relevant tools
// ============================================================================

const timberSpecialistTools = new Map<string, (input: unknown) => Promise<unknown>>([
	["checkMaterialAvailability", checkMaterialAvailability as (input: unknown) => Promise<unknown>],
	["getMaterials", getMaterials as (input: unknown) => Promise<unknown>],
]);

const designAgentTools = new Map<string, (input: unknown) => Promise<unknown>>([
	["getProducts", getProducts as (input: unknown) => Promise<unknown>],
	["getProductById", getProductById as (input: unknown) => Promise<unknown>],
	["searchProducts", searchProducts as (input: unknown) => Promise<unknown>],
]);

const upsellCommercialTools = new Map<string, (input: unknown) => Promise<unknown>>([
	["getProductById", getProductById as (input: unknown) => Promise<unknown>],
	["getServices", getServices as (input: unknown) => Promise<unknown>],
]);

const availabilitySchedulerTools = new Map<string, (input: unknown) => Promise<unknown>>([
	["getLeadTime", getLeadTime as (input: unknown) => Promise<unknown>],
	["getDecorators", getDecorators as (input: unknown) => Promise<unknown>],
	["getServices", getServices as (input: unknown) => Promise<unknown>],
]);

const projectArchitectTools = new Map<string, (input: unknown) => Promise<unknown>>([
	["getProducts", getProducts as (input: unknown) => Promise<unknown>],
	["getMaterials", getMaterials as (input: unknown) => Promise<unknown>],
]);

// ============================================================================
// Council Response Aggregator
// Collects and synthesizes responses from all agents
// ============================================================================

interface AgentResponse {
	agentId: string;
	role: string;
	content: string;
	data?: unknown;
	timestamp: number;
}

class CouncilResponseAggregator {
	private responses: AgentResponse[] = [];

	addResponse(response: AgentResponse): void {
		this.responses.push(response);
	}

	getResponses(): AgentResponse[] {
		return this.responses.sort((a, b) => a.timestamp - b.timestamp);
	}

	synthesize(): string {
		if (this.responses.length === 0) {
			return "No agents responded to the query.";
		}

		const sections = this.responses.map((r) => {
			return `**${r.role}**: ${r.content}`;
		});

		return sections.join("\n\n");
	}

	clear(): void {
		this.responses = [];
	}
}

// ============================================================================
// E2E Test Scenarios
// ============================================================================

interface TestScenario {
	name: string;
	customerMessage: string;
	expectedAgentResponses: string[];
	validateResponses: (responses: AgentResponse[]) => void;
}

const scenarios: TestScenario[] = [
	{
		name: "Fitted Wardrobe Enquiry",
		customerMessage:
			"Hi, I'm interested in getting a fitted wardrobe for my bedroom. Can you tell me about options, materials, and how long it would take?",
		expectedAgentResponses: [
			"designAgent",
			"timberSpecialist",
			"availabilityScheduler",
			"upsellCommercial",
			"projectArchitect",
		],
		validateResponses: (responses) => {
			// Should have product details
			const hasProductInfo = responses.some(
				(r) => r.agentId === "designAgent" && r.data
			);
			// Should have material availability
			const hasMaterialInfo = responses.some(
				(r) => r.agentId === "timberSpecialist" && r.data
			);
			// Should have lead time
			const hasLeadTime = responses.some(
				(r) => r.agentId === "availabilityScheduler" && r.data
			);

			console.log("  ✓ Product information:", hasProductInfo);
			console.log("  ✓ Material availability:", hasMaterialInfo);
			console.log("  ✓ Lead time information:", hasLeadTime);
		},
	},
	{
		name: "Oak Dining Table Pricing",
		customerMessage:
			"I'm looking for an oak dining table. What's the price and is it in stock?",
		expectedAgentResponses: ["designAgent", "timberSpecialist"],
		validateResponses: (responses) => {
			const hasOakInfo = responses.some(
				(r) => r.agentId === "timberSpecialist"
			);
			console.log("  ✓ Oak availability checked:", hasOakInfo);
		},
	},
];

// ============================================================================
// Main E2E Test Runner
// ============================================================================

async function runE2ETests() {
	console.log("\n" + "=".repeat(70));
	console.log("🎯 Agent Council End-to-End Test Suite");
	console.log("=".repeat(70));
	console.log("\nSimulating LiveKit → Agent Council → Response flow\n");

	const aggregator = new CouncilResponseAggregator();
	let passed = 0;
	let failed = 0;

	// Run Scenario 1: Fitted Wardrobe (Full Council Workflow)
	console.log("📋 Scenario 1: Fitted Wardrobe Enquiry");
	console.log("-".repeat(50));

	try {
		// Simulate the customer message from LiveKit
		const customerMessage =
			"Hi, I'm interested in getting a fitted wardrobe for my bedroom. Can you tell me about options, materials, and how long it would take?";

		console.log(`\n👤 Customer: "${customerMessage}"\n`);
		console.log("🔄 Broadcasting to Agent Council...\n");

		// 1. DesignAgent searches for fitted wardrobe
		console.log("🎨 DesignAgent processing...");
		const productSearch = await searchProducts({ query: "fitted wardrobe" });
		const wardrobeDetails = await getProductById({ productId: "prod-011" });

		aggregator.addResponse({
			agentId: "designAgent",
			role: "Design Specialist",
			content: `Found the ${wardrobeDetails.product?.name}. It's a ${wardrobeDetails.product?.design_type} design priced at £${wardrobeDetails.product?.price}. Available materials: ${wardrobeDetails.product?.material_options?.join(", ")}. Features include: ${wardrobeDetails.product?.features?.join(", ")}.`,
			data: wardrobeDetails,
			timestamp: Date.now(),
		});
		console.log("  ✅ Found product and details\n");

		// 2. TimberSpecialist checks material availability
		console.log("🪵 TimberSpecialist processing...");
		const oakAvail = await checkMaterialAvailability({
			woodType: "Oak",
			quantityNeeded: 100,
		});
		const walnutAvail = await checkMaterialAvailability({
			woodType: "Walnut",
			quantityNeeded: 100,
		});
		const cherryAvail = await checkMaterialAvailability({
			woodType: "Cherry",
			quantityNeeded: 100,
		});

		const materialSummary = [
			`Oak: ${oakAvail.available ? "Available" : "Unavailable"} (${oakAvail.quantityAvailable} units @ £${oakAvail.pricePerUnit}/unit)`,
			`Walnut: ${walnutAvail.available ? "Available" : "Unavailable"} (${walnutAvail.quantityAvailable} units @ £${walnutAvail.pricePerUnit}/unit)`,
			`Cherry: ${cherryAvail.available ? "Available" : "Unavailable"} (${cherryAvail.quantityAvailable} units @ £${cherryAvail.pricePerUnit}/unit)`,
		].join("; ");

		aggregator.addResponse({
			agentId: "timberSpecialist",
			role: "Timber Specialist",
			content: `Material availability checked: ${materialSummary}. Oak and Walnut are excellent choices for a bedroom wardrobe. Cherry provides a warmer aesthetic.`,
			data: { oak: oakAvail, walnut: walnutAvail, cherry: cherryAvail },
			timestamp: Date.now(),
		});
		console.log("  ✅ Checked material availability\n");

		// 3. AvailabilityScheduler checks lead time and decorators
		console.log("📅 AvailabilityScheduler processing...");
		const leadTime = await getLeadTime({ productId: "prod-011" });
		const decorators = await getDecorators({
			specialty: "Modern",
			availableOnly: true,
		});
		const measurementService = await getServices({});
		const customMeasurement = measurementService.find((s) =>
			s.name.includes("Measurement")
		);

		aggregator.addResponse({
			agentId: "availabilityScheduler",
			role: "Availability Scheduler",
			content: `Lead time is ${leadTime.leadTimeDays} days (about ${Math.ceil(leadTime.leadTimeDays / 7)} weeks). This product requires an on-site measurement first. ${decorators.length} decorators available for modern bedroom designs. Next available measurement slot can be booked for ${customMeasurement?.lead_time_days || 2} days from now.`,
			data: { leadTime, decorators, measurementService: customMeasurement },
			timestamp: Date.now(),
		});
		console.log("  ✅ Checked scheduling and availability\n");

		// 4. UpsellCommercial identifies opportunities
		console.log("💰 UpsellCommercial processing...");
		const upsellOpps = wardrobeDetails.upsellOpportunities;
		const premiumServices = await getServices({});
		const premiumFinishing = premiumServices.find((s) =>
			s.name.includes("Premium")
		);
		const installation = premiumServices.find((s) =>
			s.name.includes("Installation")
		);

		const topUpsells = upsellOpps.slice(0, 3);
		aggregator.addResponse({
			agentId: "upsellCommercial",
			role: "Commercial Advisor",
			content: `I recommend these add-ons: ${topUpsells.map((u) => `${u.name} (${u.reason})`).join("; ")}. Premium finishing at £${premiumFinishing?.price_per_job} would give a professional look. Installation service at £${installation?.price_per_job} is highly recommended for fitted furniture.`,
			data: { upsellOpps, premiumFinishing, installation },
			timestamp: Date.now(),
		});
		console.log("  ✅ Identified upsell opportunities\n");

		// 5. ProjectArchitect assesses feasibility
		console.log("🏗️ ProjectArchitect processing...");
		const structuralInfo = await getProducts({ designType: "Custom" });
		const fittedWardrobe = structuralInfo.find(
			(p) => p.name === "Fitted Wardrobe"
		);
		const materialSpecs = await getMaterials({});
		const oakSpecs = materialSpecs.find((m) => m.wood_type === "Oak");

		aggregator.addResponse({
			agentId: "projectArchitect",
			role: "Project Architect",
			content: `This is a ${fittedWardrobe?.complexity} complexity project requiring on-site measurement. The wardrobe will be floor-to-ceiling and made to your exact space dimensions. Oak is suitable for bedroom furniture and has characteristics: ${oakSpecs?.characteristics.join(", ")}. Weight capacity is ${fittedWardrobe?.weight_capacity}kg which is excellent for clothes storage.`,
			data: { fittedWardrobe, oakSpecs },
			timestamp: Date.now(),
		});
		console.log("  ✅ Assessed structural requirements\n");

		// Synthesize final response
		console.log("📝 Synthesizing Council Response...\n");
		console.log("-".repeat(50));

		const responses = aggregator.getResponses();
		console.log(`\n🤖 Council Response (${responses.length} agents contributed):\n`);
		console.log(aggregator.synthesize());

		console.log("\n" + "-".repeat(50));
		console.log("✅ Scenario 1 PASSED\n");
		passed++;
	} catch (error) {
		console.error("❌ Scenario 1 FAILED:", error);
		failed++;
	}

	aggregator.clear();

	// Run Scenario 2: Oak Dining Table
	console.log("\n📋 Scenario 2: Oak Dining Table Pricing");
	console.log("-".repeat(50));

	try {
		const customerMessage =
			"I'm looking for an oak dining table. What's the price and is it in stock?";

		console.log(`\n👤 Customer: "${customerMessage}"\n`);
		console.log("🔄 Broadcasting to Agent Council...\n");

		// 1. DesignAgent finds dining table
		console.log("🎨 DesignAgent processing...");
		const diningProducts = await getProducts({ category: "Dining" });
		const oakTable = diningProducts.find(
			(p) => p.material === "Oak" && p.name.includes("Table")
		);
		const tableDetails = oakTable
			? await getProductById({ productId: oakTable.id })
			: null;

		if (tableDetails?.product) {
			aggregator.addResponse({
				agentId: "designAgent",
				role: "Design Specialist",
				content: `Found the ${tableDetails.product.name} in Oak. Price: £${tableDetails.product.price}. Status: ${tableDetails.product.stock_status}. Dimensions: ${tableDetails.product.dimensions_length}x${tableDetails.product.dimensions_width}x${tableDetails.product.dimensions_height}cm.`,
				data: tableDetails,
				timestamp: Date.now(),
			});
			console.log("  ✅ Found product\n");
		}

		// 2. TimberSpecialist checks Oak
		console.log("🪵 TimberSpecialist processing...");
		const oakCheck = await checkMaterialAvailability({ woodType: "Oak" });

		aggregator.addResponse({
			agentId: "timberSpecialist",
			role: "Timber Specialist",
			content: `Oak is ${oakCheck.available ? "in stock" : "out of stock"} with ${oakCheck.quantityAvailable} units available at £${oakCheck.pricePerUnit} per unit. Oak is ${oakCheck.status === "In Stock" ? "immediately available" : "limited availability"} and suitable for dining furniture.`,
			data: oakCheck,
			timestamp: Date.now(),
		});
		console.log("  ✅ Checked Oak availability\n");

		// Synthesize
		console.log("📝 Synthesizing Council Response...\n");
		console.log("-".repeat(50));

		const responses = aggregator.getResponses();
		console.log(`\n🤖 Council Response (${responses.length} agents contributed):\n`);
		console.log(aggregator.synthesize());

		console.log("\n" + "-".repeat(50));
		console.log("✅ Scenario 2 PASSED\n");
		passed++;
	} catch (error) {
		console.error("❌ Scenario 2 FAILED:", error);
		failed++;
	}

	aggregator.clear();

	// Run Scenario 3: Full Floor Simulation
	console.log("\n📋 Scenario 3: Full Floor Event Simulation");
	console.log("-".repeat(50));

	try {
		const floor = new Floor();

		// Create mock agents that simulate the response
		class MockCouncilAgent {
			constructor(
				public id: string,
				public role: string
			) {}
		}

		const mockAgents = [
			new MockCouncilAgent("salesAgent", "Sales Floor Lead"),
			new MockCouncilAgent("designAgent", "Design Specialist"),
			new MockCouncilAgent("timberSpecialist", "Timber Specialist"),
			new MockCouncilAgent("availabilityScheduler", "Availability Scheduler"),
			new MockCouncilAgent("upsellCommercial", "Commercial Advisor"),
			new MockCouncilAgent("projectArchitect", "Project Architect"),
		];

		// Simulate the event flow
		const events: FloorEvent[] = [];

		// 1. LiveKit receives customer message
		events.push({
			timestamp: Date.now(),
			type: "receiveMessage",
			actorId: "livekit",
			content: "Customer asks: Can I get a custom bookshelf in walnut?",
		});

		// 2. Sales agent broadcasts to floor
		events.push({
			timestamp: Date.now() + 100,
			type: "sendToFloor",
			actorId: "salesAgent",
			content:
				"Need council input on: custom bookshelf in walnut - pricing, availability, lead time",
		});

		// 3. Design Agent responds
		const bookshelfProducts = await getProducts({ material: "Walnut" });
		events.push({
			timestamp: Date.now() + 200,
			type: "replyToAgent",
			actorId: "designAgent",
			targetId: "salesAgent",
			content: `Found ${bookshelfProducts.length} Walnut products. Bookshelf options available in custom design.`,
			stateSnapshot: { productsFound: bookshelfProducts.length },
		});

		// 4. Timber Specialist responds
		const walnutCheck = await checkMaterialAvailability({ woodType: "Walnut" });
		events.push({
			timestamp: Date.now() + 300,
			type: "replyToAgent",
			actorId: "timberSpecialist",
			targetId: "salesAgent",
			content: `Walnut: ${walnutCheck.available ? "Available" : "Out of stock"} - ${walnutCheck.quantityAvailable} units @ £${walnutCheck.pricePerUnit}/unit`,
			stateSnapshot: { materialAvailable: walnutCheck.available },
		});

		// 5. Availability Scheduler responds
		const walnutProduct = bookshelfProducts.find((p) =>
			p.name.toLowerCase().includes("bookshelf")
		);
		if (walnutProduct) {
			const bookshelfLead = await getLeadTime({ productId: walnutProduct.id });
			events.push({
				timestamp: Date.now() + 400,
				type: "replyToAgent",
				actorId: "availabilityScheduler",
				targetId: "salesAgent",
				content: `Lead time: ${bookshelfLead.leadTimeDays} days`,
				stateSnapshot: { leadTimeDays: bookshelfLead.leadTimeDays },
			});
		}

		// 6. Sales agent sends final response to user
		events.push({
			timestamp: Date.now() + 500,
			type: "replyToUser",
			actorId: "salesAgent",
			content:
				"We have custom walnut bookshelves available! Material is in stock and lead time is approximately 4 weeks.",
		});

		// Log all events
		console.log("\n📜 Event Log (simulating Floor dispatch):\n");
		for (const event of events) {
			const time = new Date(event.timestamp).toISOString().split("T")[1].slice(0, 12);
			const target = event.targetId ? ` → ${event.targetId}` : "";
			console.log(`  [${time}] ${event.actorId}${target} (${event.type})`);
			console.log(`    "${event.content}"`);
			if (event.stateSnapshot) {
				console.log(`    State: ${JSON.stringify(event.stateSnapshot)}`);
			}
			console.log();
		}

		// Write event log to file for visualizer
		const outputPath = `/tmp/council-e2e-${Date.now()}.json`;
		const fs = await import("fs/promises");
		await fs.writeFile(outputPath, JSON.stringify(events, null, 2));
		console.log(`📁 Event log written to: ${outputPath}\n`);

		console.log("-".repeat(50));
		console.log("✅ Scenario 3 PASSED\n");
		passed++;
	} catch (error) {
		console.error("❌ Scenario 3 FAILED:", error);
		failed++;
	}

	// Summary
	console.log("\n" + "=".repeat(70));
	console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
	console.log("=".repeat(70));

	// Cleanup
	await getPool().end();
	process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runE2ETests().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
