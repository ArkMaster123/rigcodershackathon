import { z } from "zod";
import { MatcherRegistry } from "../matchers/registry";
import type { Matcher } from "../matchers/types";

// Simple text input matcher for leaf string questions
export const stringMatcher: Matcher = {
	name: "default-string",
	priority: -1,
	match: (schema) => {
		if (schema instanceof z.ZodString) return StringInput;
		return null;
	},
};

// Simple number input matcher for leaf number questions
export const numberMatcher: Matcher = {
	name: "default-number",
	priority: -1,
	match: (schema) => {
		if (schema instanceof z.ZodNumber) return NumberInput;
		return null;
	},
};

// Simple boolean input matcher for leaf boolean questions
export const booleanMatcher: Matcher = {
	name: "default-boolean",
	priority: -1,
	match: (schema) => {
		if (schema instanceof z.ZodBoolean) return BooleanInput;
		return null;
	},
};

// Simple enum input matcher for leaf enum questions
export const enumMatcher: Matcher = {
	name: "default-enum",
	priority: -1,
	match: (schema) => {
		if (schema instanceof z.ZodEnum) return EnumInput;
		return null;
	},
};

const StringInput = ({ data, setValue, errors }: any) => (
	<div>
		<input
			value={data || ""}
			onChange={(e) => setValue(e.target.value)}
			style={{ border: errors ? "1px solid red" : "1px solid #ccc" }}
		/>
		{errors && <div style={{ color: "red" }}> {errors.join(", ")} </div>}
	</div>
);

const NumberInput = ({ data, setValue, errors }: any) => (
	<div>
		<input
			type="number"
			value={data ?? ""}
			onChange={(e) => setValue(Number.parseFloat(e.target.value))}
			style={{ border: errors ? "1px solid red" : "1px solid #ccc" }}
		/>
		{errors && <div style={{ color: "red" }}> {errors.join(", ")} </div>}
	</div>
);

const BooleanInput = ({ data, setValue, errors }: any) => (
	<div>
		<label>
			<input
				type="checkbox"
				checked={data ?? false}
				onChange={(e) => setValue(e.target.checked)}
			/>
		</label>
		{errors && <div style={{ color: "red" }}> {errors.join(", ")} </div>}
	</div>
);

const EnumInput = ({ schema, data, setValue, errors }: any) => {
	const values = Object.keys(schema.enum);
	return (
		<div>
			<select
				value={data ?? ""}
				onChange={(e) => setValue(e.target.value)}
				style={{ border: errors ? "1px solid red" : "1px solid #ccc" }}
			>
				<option value="">Select...</option>
				{values.map((val: string) => (
					<option key={val} value={val}>
						{val}
					</option>
				))}
			</select>
			{errors && <div style={{ color: "red" }}> {errors.join(", ")} </div>}
		</div>
	);
};

export const defaultRegistry = new MatcherRegistry();
defaultRegistry.register(stringMatcher);
defaultRegistry.register(numberMatcher);
defaultRegistry.register(booleanMatcher);
defaultRegistry.register(enumMatcher);
