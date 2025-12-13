import "@hack/test-utils/test-log";

import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { deriveState } from "./engine";

describe("deriveState - discriminated union question numbering", () => {
	const unionSchema = z.discriminatedUnion("type", [
		z.object({
			type: z.literal("male"),
			barMitzvah: z.boolean(),
		}),
		z.object({
			type: z.literal("female"),
			batMitzvah: z.boolean(),
		}),
	]);

	const schema = z.object({
		name: z.string(),
		gender: unionSchema,
		age: z.number(),
	});

	test("just union schema", () => {
		const state = deriveState(unionSchema, {});

		// Should have: gender (discriminator)
		expect(state.activeQuestions).toEqual(["type"]);
		expect(state.isComplete).toEqual(false);
		expect(state.completedSteps).toEqual([]);

		// Q1: gender (type)
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("type")).toBe(1);
	});

	test("just union schema 2", () => {
		const schema = z.discriminatedUnion("type", [
			z.object({
				type: z.literal("personal"),
				hobbies: z.string(),
			}),
			z.object({
				type: z.literal("business"),
				company: z.string(),
			}),
		]);

		const state = deriveState(schema, {});
		expect(state.activeQuestions).toEqual(["type"]);
		expect(state.completedSteps).toEqual([]);
		expect(state.isComplete).toEqual(false);
	});

	test("no data - only top-level questions are active", () => {
		const state = deriveState(schema, {});

		// Should have: name, gender (discriminator), age
		// Sub-questions (barMitzvah/batMitzvah) are NOT active yet
		expect(state.activeQuestions).toEqual(["name", "gender.type", "age"]);

		// Q1: name
		// Q2: gender (type)
		// Q3: age
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("name")).toBe(1);
		expect(getQuestionNumber("gender.type")).toBe(2);
		expect(getQuestionNumber("age")).toBe(3);
	});

	test("gender selected as male - barMitzvah becomes active", () => {
		const state = deriveState(schema, {
			name: "Alex",
			gender: {
				type: "male",
			},
		});

		// Should have: name, gender (discriminator), barMitzvah, age
		expect(state.activeQuestions).toEqual([
			"name",
			"gender.type",
			"gender.barMitzvah",
			"age",
		]);

		// Q1: name
		// Q2: gender (type)
		// Q3: barMitzvah (sub-question that appeared)
		// Q4: age (shifted down)
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("name")).toBe(1);
		expect(getQuestionNumber("gender.type")).toBe(2);
		expect(getQuestionNumber("gender.barMitzvah")).toBe(3);
		expect(getQuestionNumber("age")).toBe(4);
	});

	test("gender selected as female - batMitzvah becomes active", () => {
		const state = deriveState(schema, {
			name: "Sarah",
			gender: {
				type: "female",
			},
		});

		// Should have: name, gender (discriminator), batMitzvah, age
		expect(state.activeQuestions).toEqual([
			"name",
			"gender.type",
			"gender.batMitzvah",
			"age",
		]);

		// Q1: name
		// Q2: gender (type)
		// Q3: batMitzvah (sub-question)
		// Q4: age
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("name")).toBe(1);
		expect(getQuestionNumber("gender.type")).toBe(2);
		expect(getQuestionNumber("gender.batMitzvah")).toBe(3);
		expect(getQuestionNumber("age")).toBe(4);
	});

	test("all questions answered", () => {
		const state = deriveState(schema, {
			name: "Alex",
			gender: {
				type: "male",
				barMitzvah: false,
			},
			age: 18,
		});

		expect(state.activeQuestions).toEqual([
			"name",
			"gender.type",
			"gender.barMitzvah",
			"age",
		]);

		// Question numbers remain stable even when all answered
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("name")).toBe(1);
		expect(getQuestionNumber("gender.type")).toBe(2);
		expect(getQuestionNumber("gender.barMitzvah")).toBe(3);
		expect(getQuestionNumber("age")).toBe(4);

		expect(state.isComplete).toBe(true);
	});
});

describe("deriveState - property details with flat sub-questions", () => {
	const PropertyDetailsSchema = z.discriminatedUnion("propertyType", [
		// Branch A: Non-Flat (no additional fields)
		z.object({
			propertyType: z.enum(["House", "Bungalow"]).meta({
				label: "What best describes your home?",
				widget: "cards",
				compact: true,
			}),
		}),
		// Branch B: Flat (with additional fields)
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

	const Schema = z.object({
		name: z.string(),
		propertyDetails: PropertyDetailsSchema.meta({
			label: "Property Details",
			widget: "cards",
			compact: true,
		}),
		value: z.number(),
	});

	test("no data - only discriminator question", () => {
		const state = deriveState(Schema, {});

		// Should have only the discriminator
		expect(state.activeQuestions).toEqual([
			"name",
			"propertyDetails.propertyType",
			"value",
		]);

		// Q1: propertyType
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("propertyDetails.propertyType")).toBe(2);
	});

	test("House selected - no additional questions", () => {
		const state = deriveState(Schema, {
			name: "Example",
			propertyDetails: {
				propertyType: "House",
			},
			value: 100,
		});

		// Should still have only the discriminator (no additional fields in House branch)
		expect(state.activeQuestions).toEqual([
			"name",
			"propertyDetails.propertyType",
			"value",
		]);

		// Q1: name
		// Q2: propertyType
		// Q3: value
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("name")).toBe(1);
		expect(getQuestionNumber("propertyDetails.propertyType")).toBe(2);
		expect(getQuestionNumber("value")).toBe(3);

		expect(state.isComplete).toBe(true);
	});

	test("Flat selected - two additional questions appear", () => {
		const state = deriveState(Schema, {
			propertyDetails: {
				propertyType: "Flat",
			},
		});

		// Should have: propertyType, flatFloor, acceptAccessCost
		//
		expect(state.activeQuestions).toEqual([
			"name",
			"propertyDetails.propertyType",
			"propertyDetails.flatFloor",
			"propertyDetails.acceptAccessCost",
			"value",
		]);

		// Q1: propertyType
		// Q2: flatFloor (new)
		// Q3: acceptAccessCost (new)
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("propertyDetails.propertyType")).toBe(2);
		expect(getQuestionNumber("propertyDetails.flatFloor")).toBe(3);
		expect(getQuestionNumber("propertyDetails.acceptAccessCost")).toBe(4);
	});

	test("Flat with floor selected - cursor on name (first required field)", () => {
		const state = deriveState(Schema, {
			propertyDetails: {
				propertyType: "Flat",
				flatFloor: "Ground",
			},
		});

		expect(state.activeQuestions).toEqual([
			"name",
			"propertyDetails.propertyType",
			"propertyDetails.flatFloor",
			"propertyDetails.acceptAccessCost",
			"value",
		]);

		// Question numbers stable
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("propertyDetails.propertyType")).toBe(2);
		expect(getQuestionNumber("propertyDetails.flatFloor")).toBe(3);
		expect(getQuestionNumber("propertyDetails.acceptAccessCost")).toBe(4);

		// Cursor is on name since it's the first required field that's missing
		expect(state.currentCursor).toBe("name");
		expect(state.isComplete).toBe(false);
	});

	test("Flat fully answered - all complete", () => {
		const state = deriveState(Schema, {
			name: "Example",
			propertyDetails: {
				propertyType: "Flat",
				flatFloor: "Ground",
				acceptAccessCost: true,
			},
			value: 100,
		});

		expect(state.activeQuestions).toEqual([
			"name",
			"propertyDetails.propertyType",
			"propertyDetails.flatFloor",
			"propertyDetails.acceptAccessCost",
			"value",
		]);

		// Question numbers remain stable
		const getQuestionNumber = (path: string) =>
			state.activeQuestions.indexOf(path) + 1;
		expect(getQuestionNumber("propertyDetails.propertyType")).toBe(2);
		expect(getQuestionNumber("propertyDetails.flatFloor")).toBe(3);
		expect(getQuestionNumber("propertyDetails.acceptAccessCost")).toBe(4);

		expect(state.isComplete).toBe(true);
	});
});
