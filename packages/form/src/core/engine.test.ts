import "@hack/test-utils/test-log";

import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { deriveState } from "./engine";

// Mock Data
const WizardSchema = z.tuple([
	z.object({ name: z.string().min(1) }),
	z.discriminatedUnion("type", [
		z.object({ type: z.literal("personal"), age: z.number() }),
		z.object({ type: z.literal("company"), companyName: z.string() }),
	]),
	z.object({ final: z.boolean() }),
]);

describe("Core Engine", () => {
	// test("Empty Data -> Cursor at 0", () => {
	//   const state = deriveState(WizardSchema, {});
	//   expect(state.currentCursor).toBe("0.name");
	//   expect(state.completedSteps).toEqual([]);
	// });

	// test("Step 1 Complete -> Cursor at 1.type", () => {
	//   const state = deriveState(WizardSchema, { 0: { name: "Alice" } });
	//   expect(state.completedSteps).toContain("0.name");
	//   expect(state.currentCursor).toBe("1.type");
	// });

	// test("Step 1 Union Missing Discriminator -> Stuck at 1.type", () => {
	//   const state = deriveState(WizardSchema, { 0: { name: "Alice" }, 1: {} });
	//   expect(state.currentCursor).toBe("1.type");
	// });

	// test("Step 2 Complete -> Is Complete", () => {
	//   const state = deriveState(WizardSchema, {
	//     0: { name: "Alice" },
	//     1: { type: "personal", age: 25 },
	//     2: { final: true },
	//   });
	//   expect(state.isComplete).toBe(true);
	//   expect(state.currentCursor).toBe(null);
	// });

	test("Step 1 Union Selected (Personal) -> Cursor at 2", () => {
		const state = deriveState(WizardSchema, {
			0: { name: "Alice" },
			1: { type: "personal", age: 25 },
		});
		expect(state.completedSteps).toContain("0.name");
		expect(state.completedSteps).toContain("1.type");
		expect(state.completedSteps).toContain("1.age");
		expect(state.currentCursor).toBe("2.final");
	});

	test("NewHomeFormSchema with Metadata", () => {
		const NewHomeFormSchema = z.object({
			userType: z.enum(["Homeowner", "Landlord"]).meta({
				label: "Are you a Homeowner or Landlord?",
				widget: "cards",
				options: [
					{ value: "Homeowner", icon: "Home", label: "Homeowner" },
					{ value: "Landlord", icon: "Building2", label: "Landlord" },
				],
			}),
		});

		// 1. Empty State
		const emptyState = deriveState(NewHomeFormSchema, {});
		expect(emptyState.currentCursor).toBe("userType");
		expect(emptyState.isComplete).toBe(false);

		// 2. Complete State
		const fullState = deriveState(NewHomeFormSchema, { userType: "Homeowner" });
		expect(fullState.isComplete).toBe(true);
		expect(fullState.currentCursor).toBe(null);
	});
});
