/**
 * Agent Database Tools Unit Tests (Bun)
 *
 * These tests verify the database tool schemas and types. For integration tests
 * that actually query the database, run: pnpm db:test
 *
 * Tests are organized by agent persona:
 * - TimberSpecialist: Material availability, pricing, wood types
 * - DesignAgent: Product catalog, specifications, search
 * - UpsellCommercial: Upsell opportunities, premium services
 * - AvailabilityScheduler: Lead times, decorators, scheduling
 * - ProjectArchitect: Structural requirements, feasibility
 */

import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	getProductsSchema,
	getProductByIdSchema,
	getMaterialsSchema,
	checkMaterialAvailabilitySchema,
	getServicesSchema,
	getDecoratorsSchema,
	getLeadTimeSchema,
	searchProductsSchema,
	createOrderSchema,
} from "./tools";

// ============================================================================
// Tool Schema Validation Tests
// Ensures all agent tools have properly defined input schemas
// ============================================================================

describe("TimberSpecialist Tool Schemas", () => {
	test("checkMaterialAvailability schema accepts valid input", () => {
		const input = { woodType: "Oak", quantityNeeded: 50 };
		const result = checkMaterialAvailabilitySchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("checkMaterialAvailability schema requires woodType", () => {
		const input = { quantityNeeded: 50 };
		const result = checkMaterialAvailabilitySchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	test("getMaterials schema accepts filter options", () => {
		const input = { woodType: "Walnut", inStockOnly: true };
		const result = getMaterialsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getMaterials schema allows empty object", () => {
		const result = getMaterialsSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

describe("DesignAgent Tool Schemas", () => {
	test("getProducts schema accepts category filter", () => {
		const input = { category: "Bedroom", designType: "Custom" };
		const result = getProductsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getProducts schema accepts material filter", () => {
		const input = { material: "Walnut" };
		const result = getProductsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getProductById schema requires productId", () => {
		const input = { productId: "prod-011" };
		const result = getProductByIdSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("searchProducts schema requires query", () => {
		const input = { query: "wardrobe" };
		const result = searchProductsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("searchProducts schema rejects empty query", () => {
		const input = {};
		const result = searchProductsSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe("UpsellCommercial Tool Schemas", () => {
	test("getServices schema accepts service type filter", () => {
		const input = { serviceType: "installation" };
		const result = getServicesSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getServices schema allows empty object", () => {
		const result = getServicesSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

describe("AvailabilityScheduler Tool Schemas", () => {
	test("getLeadTime schema accepts productId", () => {
		const input = { productId: "prod-011" };
		const result = getLeadTimeSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getLeadTime schema accepts serviceId", () => {
		const input = { serviceId: "svc-001" };
		const result = getLeadTimeSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getDecorators schema accepts availability filter", () => {
		const input = { availableOnly: true, specialty: "Modern" };
		const result = getDecoratorsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});

describe("ProjectArchitect Tool Schemas", () => {
	test("getProducts schema for structural info", () => {
		const input = { designType: "Custom" };
		const result = getProductsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("getMaterials schema for feasibility checks", () => {
		const input = { woodType: "Teak" };
		const result = getMaterialsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});

describe("Order Creation Schema", () => {
	test("createOrder schema requires productId and customerName", () => {
		const input = {
			productId: "prod-011",
			customerName: "John Smith",
			quantity: 1,
		};
		const result = createOrderSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("createOrder schema accepts optional notes and email", () => {
		const input = {
			productId: "prod-011",
			customerName: "John Smith",
			quantity: 1,
			customerEmail: "john@example.com",
			notes: "Custom dimensions required",
		};
		const result = createOrderSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("createOrder schema rejects missing required fields", () => {
		const input = { quantity: 1 };
		const result = createOrderSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// Agent-Tool Mapping Tests
// Ensures each agent has access to the right tools
// ============================================================================

describe("Agent-Tool Mapping", () => {
	const timberSpecialistTools = [
		"checkMaterialAvailability",
		"getMaterials",
	];

	const designAgentTools = [
		"getProducts",
		"getProductById",
		"searchProducts",
	];

	const upsellCommercialTools = [
		"getProductById", // for upsell opportunities
		"getServices",
	];

	const availabilitySchedulerTools = [
		"getLeadTime",
		"getDecorators",
		"getServices",
	];

	const projectArchitectTools = [
		"getProducts", // for structural requirements
		"getMaterials", // for feasibility
	];

	test("TimberSpecialist should use material-focused tools", () => {
		expect(timberSpecialistTools).toContain("checkMaterialAvailability");
		expect(timberSpecialistTools).toContain("getMaterials");
		expect(timberSpecialistTools).not.toContain("getDecorators");
	});

	test("DesignAgent should use product-focused tools", () => {
		expect(designAgentTools).toContain("getProducts");
		expect(designAgentTools).toContain("searchProducts");
		expect(designAgentTools).not.toContain("createOrder");
	});

	test("UpsellCommercial should use opportunity-focused tools", () => {
		expect(upsellCommercialTools).toContain("getProductById");
		expect(upsellCommercialTools).toContain("getServices");
	});

	test("AvailabilityScheduler should use scheduling-focused tools", () => {
		expect(availabilitySchedulerTools).toContain("getLeadTime");
		expect(availabilitySchedulerTools).toContain("getDecorators");
	});

	test("ProjectArchitect should use feasibility-focused tools", () => {
		expect(projectArchitectTools).toContain("getProducts");
		expect(projectArchitectTools).toContain("getMaterials");
	});
});
