import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { getFlatQuestions } from "./flatten";

describe("getFlatQuestions", () => {
	it("should handle flat objects (Parallel)", () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		});

		const questions = getFlatQuestions(schema, {});

		expect(questions.map((q) => q.path.join("."))).toEqual(["name", "age"]);
	});

	it("should handle nested objects", () => {
		const schema = z.object({
			user: z.object({
				name: z.string(),
				address: z.object({
					city: z.string(),
				}),
			}),
		});

		const questions = getFlatQuestions(schema, {});

		expect(questions.map((q) => q.path.join("."))).toEqual([
			"user.name",
			"user.address.city",
		]);
	});

	describe("Tuples (Sequential / Wizard Flow)", () => {
		const wizardSchema = z.tuple([
			z.object({ step1: z.string() }),
			z.object({ step2: z.number() }),
			z.object({ step3: z.boolean() }),
		]);

		it("should only show step 1 when no data is present", () => {
			const questions = getFlatQuestions(wizardSchema, {});
			expect(questions.map((q) => q.path.join("."))).toEqual(["0.step1"]);
		});

		it("should show step 2 when step 1 has data", () => {
			const data = { 0: { step1: "done" } };
			const questions = getFlatQuestions(wizardSchema, data);
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"0.step1",
				"1.step2",
			]);
		});

		it("should show step 3 when step 1 and 2 have data", () => {
			const data = { 0: { step1: "done" }, 1: { step2: 123 } };
			const questions = getFlatQuestions(wizardSchema, data);
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"0.step1",
				"1.step2",
				"2.step3",
			]);
		});

		it("should stop traversing if a middle step is missing data", () => {
			// Step 2 content missing, should stop at step 2
			const questions = getFlatQuestions(wizardSchema, {
				0: { step1: "done" },
				1: undefined,
			});
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"0.step1",
				"1.step2",
			]);
		});
	});

	describe("Discriminated Unions (Branching)", () => {
		const unionSchema = z.discriminatedUnion("type", [
			z.object({ type: z.literal("A"), fieldA: z.string() }),
			z.object({ type: z.literal("B"), fieldB: z.number() }),
		]);

		it("should always show the discriminator", () => {
			const questions = getFlatQuestions(unionSchema, {});
			expect(questions.map((q) => q.path.join("."))).toEqual(["type"]);
			expect(questions[0].type).toBe("discriminator");
		});

		it("should traverse branch A when discriminator is A", () => {
			const questions = getFlatQuestions(unionSchema, { type: "A" });
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"type",
				"fieldA",
			]);
		});

		it("should traverse branch B when discriminator is B", () => {
			const questions = getFlatQuestions(unionSchema, { type: "B" });
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"type",
				"fieldB",
			]);
		});

		it("should NOT show branch fields if discriminator value is invalid", () => {
			const questions = getFlatQuestions(unionSchema, { type: "C" });
			expect(questions.map((q) => q.path.join("."))).toEqual(["type"]);
		});
	});

	describe("Property Details Union (Real-world example)", () => {
		const PropertyTypeBase = z.enum([
			"Detached",
			"Semi-Detached",
			"Terraced",
			"Bungalow",
		]);

		const PropertyDetailsSchema = z.discriminatedUnion("propertyType", [
			// Branch A: Non-Flat
			z.object({
				propertyType: PropertyTypeBase.meta({
					label: "What best describes your home?",
					widget: "cards",
					compact: true,
				}),
			}),
			// Branch B: Flat
			z.object({
				propertyType: z.literal("Flat").meta({
					label: "Flat",
					widget: "cards",
					compact: true,
				}),
				flatFloor: z.enum(["Ground", "1st Floor", "2nd Floor+"]).meta({
					label: "Which floor is your flat on?",
					widget: "cards",
					branchLabel: "FLAT",
				}),
				acceptAccessCost: z.boolean().optional().meta({
					label:
						"Your flat requires access equipment (+£250). Do you accept this additional cost?",
					widget: "confirm",
				}),
			}),
		]);

		it("should show only propertyType discriminator initially", () => {
			const questions = getFlatQuestions(PropertyDetailsSchema, {});
			expect(questions.map((q) => q.path.join("."))).toEqual(["propertyType"]);
			expect(questions[0].type).toBe("discriminator");
		});

		it("should show only propertyType for non-Flat branches (Detached)", () => {
			const questions = getFlatQuestions(PropertyDetailsSchema, {
				propertyType: "Detached",
			});
			expect(questions.map((q) => q.path.join("."))).toEqual(["propertyType"]);
		});

		it("should show only propertyType for non-Flat branches (Semi-Detached)", () => {
			const questions = getFlatQuestions(PropertyDetailsSchema, {
				propertyType: "Semi-Detached",
			});
			expect(questions.map((q) => q.path.join("."))).toEqual(["propertyType"]);
		});

		it("should show all Flat branch fields when Flat is selected", () => {
			const questions = getFlatQuestions(PropertyDetailsSchema, {
				propertyType: "Flat",
			});
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"propertyType",
				"flatFloor",
				"acceptAccessCost",
			]);
		});

		it("should show all Flat fields when flatFloor is selected", () => {
			const questions = getFlatQuestions(PropertyDetailsSchema, {
				propertyType: "Flat",
				flatFloor: "Ground",
			});
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"propertyType",
				"flatFloor",
				"acceptAccessCost",
			]);
		});

		it("should show all Flat fields including optional acceptAccessCost", () => {
			const questions = getFlatQuestions(PropertyDetailsSchema, {
				propertyType: "Flat",
				flatFloor: "2nd Floor+",
				acceptAccessCost: true,
			});
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"propertyType",
				"flatFloor",
				"acceptAccessCost",
			]);
		});
	});

	describe("Complex Integration (Wizard + Union)", () => {
		const complexSchema = z.tuple([
			z.object({ name: z.string() }),
			z.discriminatedUnion("method", [
				z.object({ method: z.literal("email"), email: z.string() }),
				z.object({ method: z.literal("phone"), phone: z.string() }),
			]),
			z.object({ final: z.boolean() }),
		]);

		it("should handle flow correctly", () => {
			// 1. Start: Only name
			let questions = getFlatQuestions(complexSchema, {});
			expect(questions.map((q) => q.path.join("."))).toEqual(["0.name"]);

			// 2. Name filled: Name + Method discriminator
			questions = getFlatQuestions(complexSchema, { 0: { name: "Me" } });
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"0.name",
				"1.method",
			]);

			// 3. Method selected (email): Name + Method + Email + Final field
			// Logic B: Index 1 has data ({method: email}), so Index 2 (final) is reachable/visible.
			questions = getFlatQuestions(complexSchema, {
				0: { name: "Me" },
				1: { method: "email" },
			});
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"0.name",
				"1.method",
				"1.email",
			]);

			// 4. Email filled: Name + Method + Email + Final
			questions = getFlatQuestions(complexSchema, {
				0: { name: "Me" },
				1: { method: "email", email: "a@b.com" },
			});
			expect(questions.map((q) => q.path.join("."))).toEqual([
				"0.name",
				"1.method",
				"1.email",
				"2.final",
			]);
		});
	});
});
