import { beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { z } from "zod";
import { hasMeta, hasTag } from "../core/traversal";
import { useHackForm } from "./useHackForm";

beforeAll(() => {
	GlobalRegistrator.register();
});

const SimpleSchema = z.object({
	name: z.string(),
});

describe("React Adapter", () => {
	test("Renders Form with Default Matcher", () => {
		const TestForm = () => {
			const { render: renderForm } = useHackForm(SimpleSchema);
			return renderForm();
		};

		const { container } = render(<TestForm />);

		const input = container.querySelector("input");
		expect(input).not.toBeNull();
	});

	test("Accepts Custom Matchers and Overrides Defaults", () => {
		const CustomStringMatcher = ({ data }: any) => (
			<div data-testid="custom-string">Custom: {data}</div>
		);
		const customMatcher = {
			name: "custom-string",
			priority: 10, // Higher priority than default (-1)
			match: (schema: any) =>
				schema instanceof z.ZodString ? CustomStringMatcher : null,
		};

		const TestForm = () => {
			const { render: renderForm } = useHackForm(SimpleSchema, {}, [
				customMatcher,
			]);
			return renderForm();
		};

		const { container } = render(<TestForm />);
		expect(
			container.querySelector('[data-testid="custom-string"]'),
		).not.toBeNull();
		expect(container.querySelector("input")).toBeNull();
	});

	test("Renders Discriminated Union", async () => {
		const UnionSchema = z.discriminatedUnion("type", [
			z.object({ type: z.literal("a"), valueString: z.string() }),
			z.object({ type: z.literal("b"), valueNum: z.number() }),
		]);

		const TestForm = () => {
			const { render: renderForm } = useHackForm(UnionSchema, {});
			return renderForm();
		};

		const { container } = render(<TestForm />);

		// 1. Check for discriminator select dropdown
		const select = container.querySelector("select");
		expect(select).not.toBeNull();
		expect(select?.value).toBe("");

		// Check that options are present
		const options = Array.from(select?.querySelectorAll("option") || []);
		expect(options.length).toBe(3); // "Select...", "a", "b"
		expect(options[0].textContent).toBe("Select...");
		expect(options[1].textContent).toBe("a");
		expect(options[2].textContent).toBe("b");

		// Initially, no string input should be visible (only the discriminator)
		expect(container.querySelectorAll("input[type='text']").length).toBe(0);

		// 2. Select Type 'a'
		fireEvent.change(select!, { target: { value: "a" } });

		// 3. Verify valueString field appears
		await waitFor(() => {
			const stringInput = container.querySelector("input:not([type='number'])");
			expect(stringInput).not.toBeNull();
		});

		// 4. Test switching to 'b'
		fireEvent.change(select!, { target: { value: "b" } });

		// 5. Verify valueNum field appears (number input)
		await waitFor(() => {
			const numberInput = container.querySelector("input[type='number']");
			expect(numberInput).not.toBeNull();
			// String input should no longer be present
			const stringInput = container.querySelector("input:not([type='number'])");
			expect(stringInput).toBeNull();
		});
	});

	test("Matches based on Meta Tags", () => {
		const TaggedSchema = z.object({
			field: z.string().meta({ tags: ["custom-tag"] }),
		});

		const TaggedMatcherComponent = () => (
			<div data-testid="tagged">Tagged Field</div>
		);

		const taggedMatcher = {
			name: "tagged-matcher",
			priority: 10,
			match: <T extends z.ZodSchema>(schema: T) =>
				hasMeta(schema, z.object({ tags: z.tuple([z.literal("custom-tag")]) }))
					? TaggedMatcherComponent
					: null,
		};

		const TestForm = () => {
			const { render: renderForm } = useHackForm(TaggedSchema, {}, [
				taggedMatcher,
			]);
			return renderForm();
		};

		const { container } = render(<TestForm />);
		expect(container.querySelector('[data-testid="tagged"]')).not.toBeNull();
	});

	test("Matches based on Meta Structure", () => {
		// Use .meta() as requested. Cast to any if TS complains, assuming environment supports it.
		const TaggedSchema = z.number().meta({
			description: "complex-tag",
			widget: "special-number",
			extra: "data",
		});

		// Verify component receives meta
		const ComplexMatcherComponent = ({
			meta,
		}: {
			meta?: { widget: "special-number" };
		}) => <div data-testid="complex">Complex Match: {meta?.widget}</div>;

		// Matcher that uses a Zod Schema to validate the meta
		const complexMatcher = {
			name: "complex-matcher",
			priority: 10,
			match: <T extends z.ZodSchema>(schema: T) =>
				hasMeta(
					schema,
					z.object({
						widget: z.literal("special-number"),
					}),
				)
					? ComplexMatcherComponent
					: null,
		};

		const TestForm = () => {
			const { render: renderForm } = useHackForm(TaggedSchema, {}, [
				complexMatcher,
			]);
			return renderForm();
		};

		const { container } = render(<TestForm />);
		expect(container.querySelector('[data-testid="complex"]')).not.toBeNull();
		expect(container.textContent).toContain("Complex Match: special-number");
	});

	test("Matches based on Tags Helper", () => {
		// Use tags array in meta
		const TaggedSchema = z.string().meta({
			tags: ["my-tag", "other-tag"],
		});

		const TagMatcher = () => <div data-testid="tag-helper">Tag Match</div>;

		const matcher = {
			name: "tag-helper-matcher",
			priority: 10,
			match: <T extends z.ZodSchema>(schema: T) =>
				hasTag(schema, "other-tag") ? TagMatcher : null,
		};

		const TestForm = () => {
			const { render: renderForm } = useHackForm(TaggedSchema, {}, [matcher]);
			return renderForm();
		};

		const { container } = render(<TestForm />);
		expect(
			container.querySelector('[data-testid="tag-helper"]'),
		).not.toBeNull();
	});
});
