import "@hack/test-utils/test-log";

import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { pathToToolName, toolNameToPath } from "./formatters";
import { createAIForm, createStatelessAIForm } from "./index";
import { createSendMessageTool, generateTools } from "./tools";

describe("AI Adapter - Formatters", () => {
	test("pathToToolName converts path to tool name", () => {
		expect(pathToToolName([0, "personal", "age"])).toBe("set_0_personal_age");
		expect(pathToToolName(["name"])).toBe("set_name");
		expect(pathToToolName([1, "type"])).toBe("set_1_type");
	});

	test("toolNameToPath converts tool name back to path", () => {
		expect(toolNameToPath("set_0_personal_age")).toEqual([
			0,
			"personal",
			"age",
		]);
		expect(toolNameToPath("set_name")).toEqual(["name"]);
		expect(toolNameToPath("set_1_type")).toEqual([1, "type"]);
	});

	test("toolNameToPath throws on invalid name", () => {
		expect(() => toolNameToPath("invalid")).toThrow();
	});
});

describe("AI Adapter - Tool Generation", () => {
	test("generates tools for simple object schema", () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		});

		const tools = generateTools(schema);

		expect(tools).toHaveLength(2);
		expect(tools.find((t) => t.name === "set_name")).toBeDefined();
		expect(tools.find((t) => t.name === "set_age")).toBeDefined();
	});

	test("generates tools for tuple schema", () => {
		const schema = z.tuple([
			z.object({ name: z.string() }),
			z.object({ email: z.string() }),
		]);

		const tools = generateTools(schema);

		expect(tools).toHaveLength(1); // Only step 1 is active initially
		expect(tools.find((t) => t.name === "set_0_name")).toBeDefined();
		expect(tools.find((t) => t.name === "set_0_name")).toBeDefined();
		// set_1_email should be hidden
		expect(tools.find((t) => t.name === "set_1_email")).toBeUndefined();
	});

	test("generates tools for discriminated union", () => {
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

		const tools = generateTools(schema);

		// Should generate: set_type, set_hobbies, set_company
		expect(tools.length).toBeGreaterThanOrEqual(1); // Only discriminator should be visible initially
		expect(tools.find((t) => t.name === "set_type")).toBeDefined();
		expect(tools.find((t) => t.name === "set_type")).toBeDefined();
		// branches should be hidden
		expect(tools.find((t) => t.name === "set_hobbies")).toBeUndefined();
		expect(tools.find((t) => t.name === "set_company")).toBeUndefined();
	});

	test("generates tools for nested structures", () => {
		const schema = z.object({
			user: z.object({
				profile: z.object({
					name: z.string(),
					age: z.number(),
				}),
			}),
		});

		const tools = generateTools(schema);

		expect(tools).toHaveLength(2);
		expect(tools.find((t) => t.name === "set_user_profile_name")).toBeDefined();
		expect(tools.find((t) => t.name === "set_user_profile_age")).toBeDefined();
	});

	test("createSendMessageTool creates the sendMessage tool", () => {
		const tool = createSendMessageTool();

		expect(tool.name).toBe("sendMessage");
		expect(tool.description).toContain("message");
		expect(tool.parameters.properties.value).toBeDefined();
	});
});

describe("AI Adapter - createAIForm (Stateful)", () => {
	test("initializes with empty data", () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		});

		const form = createAIForm(schema);
		const state = form.getState();

		expect(state.data).toEqual({});
		expect(state.formState.isComplete).toBe(false);
		expect(state.formState.currentCursor).toBe("name");
	});

	test("executes tool successfully", () => {
		const schema = z.object({
			name: z.string(),
		});

		const form = createAIForm(schema);
		const result = form.executeTool("set_name", { value: "Alice" });

		expect(result.success).toBe(true);
		expect(form.getData()).toEqual({ name: "Alice" });
	});

	test("validates tool input", () => {
		const schema = z.object({
			age: z.number().min(18),
		});

		const form = createAIForm(schema);
		const result = form.executeTool("set_age", { value: 15 });

		expect(result.success).toBe(false);
		expect(result.message).toContain("Validation failed");
		expect(form.getData()).toEqual({}); // Data unchanged on failure
	});

	test("handles sendMessage tool", () => {
		const schema = z.object({
			name: z.string(),
		});

		const form = createAIForm(schema);
		const result = form.executeTool("sendMessage", {
			value: "What is your name?",
		});

		expect(result.success).toBe(true);
		expect(result.message).toBe("What is your name?");

		const state = form.getState();
		expect(state.messages).toContain("What is your name?");
	});

	test("processes multiple tools in sequence", () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		});

		const form = createAIForm(schema);
		const { data, results } = form.processTools([
			{ name: "set_name", args: { value: "Alice" } },
			{ name: "set_age", args: { value: 25 } },
		]);

		expect(results).toHaveLength(2);
		expect(results[0].success).toBe(true);
		expect(results[1].success).toBe(true);
		expect(data).toEqual({ name: "Alice", age: 25 });
	});

	test("detects form completion", () => {
		const schema = z.object({
			name: z.string(),
		});

		const form = createAIForm(schema);
		expect(form.isComplete()).toBe(false);

		form.executeTool("set_name", { value: "Alice" });
		expect(form.isComplete()).toBe(true);
	});

	test("handles tuple pagination", () => {
		const schema = z.tuple([
			z.object({ name: z.string() }),
			z.object({ email: z.string() }),
		]);

		const form = createAIForm(schema);
		let state = form.getState();

		// Initially at step 0
		expect(state.formState.currentCursor).toBe("0.name");

		// Complete step 0
		form.executeTool("set_0_name", { value: "Alice" });
		state = form.getState();

		// Now at step 1
		expect(state.formState.currentCursor).toBe("1.email");

		// Complete step 1
		form.executeTool("set_1_email", { value: "alice@example.com" });
		state = form.getState();

		// Form complete
		expect(state.formState.isComplete).toBe(true);
	});

	test("handles discriminated union branching", () => {
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

		const form = createAIForm(schema);
		let state = form.getState();

		// Initially needs discriminator (now correctly tracked as "type" field)
		expect(state.formState.currentCursor).toBe("type");

		// Set discriminator to "business"
		form.executeTool("set_type", { value: "business" });
		state = form.getState();

		// Now needs company field
		expect(state.formState.currentCursor).toBe("company");

		// Complete form
		form.executeTool("set_company", { value: "Acme Inc" });
		state = form.getState();

		expect(state.formState.isComplete).toBe(true);
		expect(form.getData()).toEqual({
			type: "business",
			company: "Acme Inc",
		});
	});

	test("allows setting future fields non-linearly", () => {
		const schema = z.tuple([
			z.object({ name: z.string() }),
			z.object({ age: z.number() }),
		]);

		const form = createAIForm(schema);

		// User provides both fields at once
		form.processTools([
			{ name: "set_0_name", args: { value: "Alice" } },
			{ name: "set_1_age", args: { value: 25 } },
		]);

		const state = form.getState();
		expect(state.formState.isComplete).toBe(true);
		expect(form.getData()).toEqual([{ name: "Alice" }, { age: 25 }]);
	});
});

describe("AI Adapter - createStatelessAIForm", () => {
	test("provides stateless interface", () => {
		const schema = z.object({
			name: z.string(),
		});

		const { state, process } = createStatelessAIForm(schema, {});

		expect(state.formState.currentCursor).toBe("name");

		const { data, results } = process([
			{ name: "set_name", args: { value: "Alice" } },
		]);

		expect(results[0].success).toBe(true);
		expect(data).toEqual({ name: "Alice" });
	});

	test("works with existing data", () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		});

		const existingData = { name: "Alice" };
		const { state, process } = createStatelessAIForm(schema, existingData);

		// Already has name, needs age
		expect(state.formState.currentCursor).toBe("age");
		expect(state.formState.completedSteps).toContain("name");

		const { data } = process([{ name: "set_age", args: { value: 25 } }]);

		expect(data).toEqual({ name: "Alice", age: 25 });
	});
});

describe("AI Adapter - System Prompt Generation", () => {
	test("generates appropriate system prompt at different stages", () => {
		const schema = z.tuple([
			z.object({ name: z.string() }),
			z.object({ age: z.number().min(18) }),
		]);

		const form = createAIForm(schema);
		let state = form.getState();

		// Initial prompt
		expect(state.systemPrompt).toContain("Current field");
		expect(state.systemPrompt).toContain("0.name");

		// After setting name
		form.executeTool("set_0_name", { value: "Alice" });
		state = form.getState();

		expect(state.systemPrompt).toContain("Completed fields");
		expect(state.systemPrompt).toContain("Current field");
		expect(state.systemPrompt).toContain("1.age");

		// After validation error
		form.executeTool("set_1_age", { value: 15 });
		state = form.getState();

		expect(state.systemPrompt).toContain("Validation errors");
	});
});

describe("AI Adapter - Edge Cases", () => {
	test("handles optional fields", () => {
		const schema = z.object({
			name: z.string(),
			nickname: z.string().optional(),
		});

		const form = createAIForm(schema);
		form.executeTool("set_name", { value: "Alice" });

		// Should be complete even without optional field
		const state = form.getState();
		expect(state.formState.errors).toBeEmpty();
		expect(state.formState.isComplete).toBe(true);
	});

	test("handles nullable fields", () => {
		const schema = z.object({
			name: z.string(),
			middleName: z.string().nullable(),
		});

		const form = createAIForm(schema);
		form.processTools([
			{ name: "set_name", args: { value: "Alice" } },
			{ name: "set_middleName", args: { value: null } },
		]);

		expect(form.getData()).toEqual({ name: "Alice", middleName: null });
	});

	test("handles nested tuples", () => {
		const schema = z.tuple([
			z.tuple([z.object({ a: z.string() }), z.object({ b: z.string() })]),
			z.object({ c: z.string() }),
		]);

		const tools = generateTools(schema);

		expect(tools.find((t) => t.name === "set_0_0_a")).toBeDefined();
		// Step 2 (0_1_b) should be HIDDEN because 0_0_a has no data
		expect(tools.find((t) => t.name === "set_0_1_b")).toBeUndefined();
		// Step 2 (1_c) of outer tuple should be HIDDEN because 0 (inner tuple) has no data
		expect(tools.find((t) => t.name === "set_1_c")).toBeUndefined();
	});
});
