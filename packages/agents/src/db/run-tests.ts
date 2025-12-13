/**
 * Agent Database Tools Test Runner
 * 
 * Tests each agent's ability to call relevant database tools based on their persona:
 * - TimberSpecialist: Material availability, pricing, wood types
 * - DesignAgent: Product catalog, specifications, search
 * - UpsellCommercial: Upsell opportunities, premium services
 * - AvailabilityScheduler: Lead times, decorators, scheduling
 * - ProjectArchitect: Structural requirements, feasibility
 * 
 * Run with: npx tsx src/db/run-tests.ts
 */

import {
	checkMaterialAvailability,
	getProducts,
	getProductById,
	getServices,
	getDecorators,
	getLeadTime,
	getMaterials,
	searchProducts,
} from "./tools";
import { getPool } from "./schema";

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
	try {
		await fn();
		results.push({ name, passed: true });
		console.log("✅", name);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		results.push({ name, passed: false, error: message });
		console.log("❌", name);
		console.log("   Error:", message);
	}
}

function assert(condition: boolean, message: string): void {
	if (!condition) throw new Error(message);
}

async function runTests() {
	console.log("\n🧪 Agent Database Tools Test Suite\n");
	console.log("=".repeat(60));

	// =========================================================================
	// TimberSpecialist Tests
	// Role: Expert in wood types, availability, and pricing
	// =========================================================================
	console.log("\n📦 TimberSpecialist Database Tools");
	console.log("   Role: Expert in wood types, availability, and pricing\n");

	await test("Check Oak availability (should be in stock)", async () => {
		const result = await checkMaterialAvailability({
			woodType: "Oak",
			quantityNeeded: 50,
		});
		assert(result.available === true, "Oak should be available");
		assert(result.quantityAvailable > 0, "Oak should have stock");
		assert(result.pricePerUnit > 0, "Oak should have a price");
		assert(result.message.includes("Oak"), "Message should mention Oak");
	});

	await test("Detect out of stock material (Mahogany)", async () => {
		const result = await checkMaterialAvailability({ woodType: "Mahogany" });
		assert(result.available === false, "Mahogany should be unavailable");
		assert(result.status === "Out of Stock", "Status should be Out of Stock");
		assert(result.quantityAvailable === 0, "Quantity should be 0");
	});

	await test("Get all materials with pricing", async () => {
		const materials = await getMaterials({});
		assert(materials.length >= 7, "Should have at least 7 materials");
		assert(materials[0].wood_type !== undefined, "Should have wood_type");
		assert(materials[0].price_per_unit !== undefined, "Should have price");
	});

	await test("Filter in-stock materials only", async () => {
		const materials = await getMaterials({ inStockOnly: true });
		for (const m of materials) {
			assert(m.quantity_available > 0, `${m.wood_type} should have stock`);
		}
	});

	await test("Check Teak with quantity constraint (low stock)", async () => {
		const result = await checkMaterialAvailability({
			woodType: "Teak",
			quantityNeeded: 200,
		});
		assert(result.available === false, "Teak should not have 200 units");
		assert(result.message.includes("120"), "Should mention available quantity");
	});

	// =========================================================================
	// DesignAgent Tests
	// Role: Expert in furniture design, materials, and pricing
	// =========================================================================
	console.log("\n🎨 DesignAgent Database Tools");
	console.log("   Role: Expert in furniture design, materials, and pricing\n");

	await test("Get all products", async () => {
		const products = await getProducts({});
		assert(products.length >= 11, "Should have at least 11 products");
	});

	await test("Filter products by category (Bedroom)", async () => {
		const products = await getProducts({ category: "Bedroom" });
		assert(products.length >= 3, "Should have bedroom products");
		for (const p of products) {
			assert(p.category === "Bedroom", "All should be bedroom category");
		}
	});

	await test("Filter products by design type (Custom)", async () => {
		const products = await getProducts({ designType: "Custom" });
		assert(products.length >= 3, "Should have custom products");
		for (const p of products) {
			assert(p.design_type === "Custom", "All should be custom design");
		}
	});

	await test("Get fitted wardrobe with full details", async () => {
		const result = await getProductById({ productId: "prod-011" });
		assert(result.product !== null, "Should find fitted wardrobe");
		assert(result.product?.name === "Fitted Wardrobe", "Correct name");
		assert(result.product?.material_options?.includes("Oak"), "Has Oak option");
		assert(result.product?.requires_measurement === true, "Requires measurement");
		assert(
			result.product?.features?.includes("Adjustable shelving"),
			"Has shelving feature"
		);
	});

	await test("Search products by keyword (wardrobe)", async () => {
		const products = await searchProducts({ query: "wardrobe" });
		assert(products.length > 0, "Should find wardrobe");
		const hasWardrobe = products.some((p) =>
			p.name.toLowerCase().includes("wardrobe")
		);
		assert(hasWardrobe, "Should include wardrobe in results");
	});

	await test("Filter products by material (Walnut)", async () => {
		const products = await getProducts({ material: "Walnut" });
		assert(products.length >= 2, "Should have Walnut products");
		for (const p of products) {
			assert(p.material === "Walnut", "All should be Walnut material");
		}
	});

	// =========================================================================
	// UpsellCommercial Tests
	// Role: Focus on margins and add-on opportunities
	// =========================================================================
	console.log("\n💰 UpsellCommercial Database Tools");
	console.log("   Role: Focus on margins and add-on opportunities\n");

	await test("Get upsell opportunities for fitted wardrobe", async () => {
		const result = await getProductById({ productId: "prod-011" });
		assert(result.upsellOpportunities.length >= 6, "Should have 6+ upsells");
		const measurementUpsell = result.upsellOpportunities.find((u) =>
			u.name.includes("Measurement")
		);
		assert(measurementUpsell !== undefined, "Should have measurement upsell");
		assert(
			measurementUpsell?.reason.includes("Required"),
			"Measurement should be required"
		);
	});

	await test("Get upsell opportunities for dining table", async () => {
		const result = await getProductById({ productId: "prod-001" });
		assert(result.upsellOpportunities.length >= 1, "Should have upsells");
		const chairUpsell = result.upsellOpportunities.find((u) =>
			u.name.includes("Chair")
		);
		assert(chairUpsell !== undefined, "Should suggest chairs");
	});

	await test("Get premium services for upselling", async () => {
		const services = await getServices({});
		const premiumFinishing = services.find((s) =>
			s.name.includes("Premium Finishing")
		);
		assert(premiumFinishing !== undefined, "Should have premium finishing");
		assert(premiumFinishing!.price_per_job > 0, "Should have price");
		const whiteGlove = services.find((s) => s.name.includes("White Glove"));
		assert(whiteGlove !== undefined, "Should have white glove delivery");
	});

	await test("Get bed frame upsells for bedroom set", async () => {
		const result = await getProductById({ productId: "prod-006" });
		const nightstandUpsell = result.upsellOpportunities.find((u) =>
			u.name.includes("Nightstand")
		);
		assert(nightstandUpsell !== undefined, "Should suggest nightstands");
	});

	// =========================================================================
	// AvailabilityScheduler Tests
	// Role: Manage logistics, delivery slots, and consultation bookings
	// =========================================================================
	console.log("\n📅 AvailabilityScheduler Database Tools");
	console.log(
		"   Role: Manage logistics, delivery slots, and consultation bookings\n"
	);

	await test("Get lead time for fitted wardrobe (56 days)", async () => {
		const result = await getLeadTime({ productId: "prod-011" });
		assert(result.found === true, "Should find product");
		assert(result.itemName === "Fitted Wardrobe", "Correct item name");
		assert(result.leadTimeDays === 56, "Lead time should be 56 days");
	});

	await test("Get lead time for installation service (3 days)", async () => {
		const result = await getLeadTime({ serviceId: "svc-001" });
		assert(result.found === true, "Should find service");
		assert(
			result.itemName === "Custom Installation Service",
			"Correct service name"
		);
		assert(result.leadTimeDays === 3, "Lead time should be 3 days");
	});

	await test("Get available decorators only", async () => {
		const decorators = await getDecorators({ availableOnly: true });
		assert(decorators.length >= 4, "Should have available decorators");
		for (const d of decorators) {
			assert(
				d.availability.toLowerCase() === "available",
				`${d.name} should be available`
			);
		}
	});

	await test("Get decorators by specialty (Modern)", async () => {
		const decorators = await getDecorators({ specialty: "Modern" });
		assert(decorators.length > 0, "Should find modern decorator");
		const hasModern = decorators.some((d) =>
			d.specialty.toLowerCase().includes("modern")
		);
		assert(hasModern, "Should include modern specialist");
	});

	await test("Detect booked decorator (Lisa Park)", async () => {
		const decorators = await getDecorators({});
		const booked = decorators.find(
			(d) => d.availability.toLowerCase() === "booked"
		);
		assert(booked !== undefined, "Should have a booked decorator");
		assert(booked?.name === "Lisa Park", "Lisa Park should be booked");
	});

	// =========================================================================
	// ProjectArchitect Tests
	// Role: Structural integrity and design feasibility
	// =========================================================================
	console.log("\n🏗️ ProjectArchitect Database Tools");
	console.log("   Role: Structural integrity and design feasibility\n");

	await test("Get products with structural requirements", async () => {
		const products = await getProducts({});
		for (const p of products) {
			assert(p.weight_capacity !== undefined, "Should have weight_capacity");
			assert(p.complexity !== undefined, "Should have complexity");
			assert(p.dimensions_length !== undefined, "Should have dimensions");
		}
	});

	await test("Identify high complexity products", async () => {
		const products = await getProducts({});
		const highComplexity = products.filter((p) => p.complexity === "High");
		assert(highComplexity.length >= 4, "Should have high complexity products");
		const fittedWardrobe = highComplexity.find(
			(p) => p.name === "Fitted Wardrobe"
		);
		assert(fittedWardrobe !== undefined, "Fitted wardrobe should be high complexity");
	});

	await test("Check material suitability (Oak for Dining)", async () => {
		const materials = await getMaterials({});
		const oak = materials.find((m) => m.wood_type === "Oak");
		assert(oak !== undefined, "Should have Oak");
		assert(oak!.suitable_for.includes("Dining"), "Oak should be suitable for dining");
	});

	await test("Check material characteristics (Teak weather resistant)", async () => {
		const materials = await getMaterials({});
		const teak = materials.find((m) => m.wood_type === "Teak");
		assert(teak !== undefined, "Should have Teak");
		assert(
			teak!.characteristics.includes("Weather resistant"),
			"Teak should be weather resistant"
		);
	});

	await test("Identify products requiring measurement", async () => {
		const products = await getProducts({ designType: "Custom" });
		const requiresMeasurement = products.filter((p) => p.requires_measurement);
		assert(requiresMeasurement.length >= 1, "Should have products requiring measurement");
	});

	// =========================================================================
	// Cross-Agent Workflow Tests
	// =========================================================================
	console.log("\n🔄 Cross-Agent Workflow Scenarios\n");

	await test("Fitted wardrobe enquiry (full workflow)", async () => {
		// 1. DesignAgent finds product
		const searchResult = await searchProducts({ query: "fitted wardrobe" });
		assert(searchResult.length > 0, "DesignAgent should find wardrobe");
		const wardrobe = searchResult[0];

		// 2. TimberSpecialist checks materials
		const oakAvail = await checkMaterialAvailability({
			woodType: "Oak",
			quantityNeeded: 100,
		});
		assert(oakAvail.available, "TimberSpecialist confirms Oak available");

		// 3. UpsellCommercial gets opportunities
		const details = await getProductById({ productId: wardrobe.id });
		assert(
			details.upsellOpportunities.length >= 6,
			"UpsellCommercial finds 6+ opportunities"
		);

		// 4. AvailabilityScheduler checks lead time and decorator
		const leadTime = await getLeadTime({ productId: wardrobe.id });
		assert(leadTime.leadTimeDays === 56, "AvailabilityScheduler confirms 56 days");
		const decorator = await getDecorators({
			specialty: "Modern",
			availableOnly: true,
		});
		assert(decorator.length > 0, "AvailabilityScheduler finds decorator");

		// 5. ProjectArchitect verifies feasibility
		assert(wardrobe.complexity === "High", "ProjectArchitect notes high complexity");
		assert(wardrobe.requires_measurement, "ProjectArchitect confirms measurement needed");
	});

	await test("Dining room set enquiry (full workflow)", async () => {
		// 1. DesignAgent finds dining products
		const diningProducts = await getProducts({ category: "Dining" });
		assert(diningProducts.length >= 2, "DesignAgent finds dining products");

		// 2. TimberSpecialist checks Oak
		const oakCheck = await checkMaterialAvailability({ woodType: "Oak" });
		assert(oakCheck.available, "TimberSpecialist confirms Oak available");

		// 3. UpsellCommercial suggests chairs
		const table = diningProducts.find((p) => p.name.includes("Table"));
		const tableDetails = await getProductById({ productId: table!.id });
		const chairUpsell = tableDetails.upsellOpportunities.find((u) =>
			u.name.includes("Chair")
		);
		assert(chairUpsell !== undefined, "UpsellCommercial suggests chairs");

		// 4. AvailabilityScheduler checks decorator
		const traditionalDecorator = await getDecorators({ specialty: "Traditional" });
		assert(
			traditionalDecorator.length > 0,
			"AvailabilityScheduler finds traditional decorator"
		);
	});

	// =========================================================================
	// Summary
	// =========================================================================
	console.log("\n" + "=".repeat(60));
	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;
	console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

	if (failed > 0) {
		console.log("Failed tests:");
		for (const r of results.filter((r) => !r.passed)) {
			console.log(`  ❌ ${r.name}: ${r.error}`);
		}
	}

	console.log("=".repeat(60));

	await getPool().end();
	process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
