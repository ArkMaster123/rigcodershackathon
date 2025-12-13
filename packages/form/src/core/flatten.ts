import { fn } from "@traversable/registry";
import { Functor, tagged } from "@traversable/zod";
import { z } from "zod";

export interface FlatQuestion {
	path: (string | number)[];
	schema: z.ZodTypeAny;
	type: "leaf" | "discriminator";
}

function getValueAtPath(data: unknown, path: (string | number)[]): unknown {
	let current: any = data;
	for (const key of path) {
		if (current === null || current === undefined) return undefined;
		current = current[key];
	}
	return current;
}

export function getFlatQuestions(
	schema: z.ZodTypeAny,
	data: unknown = {},
): FlatQuestion[] {
	// the fold function will produce new values for each instance of `data`
	// TODO: we can cache this, probably..
	const fold = fn.catamorphism(Functor, { path: [], seen: new WeakMap() });

	const X = fold<FlatQuestion[]>((src, index, schema) => {
		const path = index.path.filter(
			(p) => typeof p === "string" || typeof p === "number",
		);

		switch (true) {
			case tagged("object")(src):
				return Object.entries(src._zod.def.shape).flatMap(([k, v]) => v);
			case tagged("tuple")(src): {
				const items = src._zod.def.items as FlatQuestion[][];
				const itemSchemas = (schema as any)._def.items as z.ZodTypeAny[];
				const tupleData = getValueAtPath(data, path) as unknown[] | undefined;

				const result: FlatQuestion[] = [];

				for (let i = 0; i < items.length; i++) {
					const stepQuestions = items[i];
					result.push(...stepQuestions);

					// If we are at the last item, we don't need to check validation to proceed
					if (i === items.length - 1) break;

					const stepData = tupleData?.[i];
					const stepSchema = itemSchemas[i];

					const parseResult = stepSchema.safeParse(stepData);

					if (!parseResult.success) {
						break;
					}
				}
				return result;
			}
			case tagged("string")(src):
				return [{ path, schema: src, type: "leaf" }];
			case tagged("number")(src):
				return [{ path, schema: src, type: "leaf" }];
			case tagged("boolean")(src):
				return [{ path, schema: src, type: "leaf" }];
			case tagged("enum")(src):
				return [{ path, schema: src, type: "leaf" }];
			case tagged("optional")(src):
				return src._zod.def.innerType.map((it) => ({
					...it,
					schema: it.schema.optional(),
				}));
			case tagged("union")(src): {
				// we only support discriminated unions
				if (!src._zod.def.discriminator) return [];

				// the virtual discriminator FlatQuestion
				const discriminator: FlatQuestion = {
					path: [...path, src._zod.def.discriminator],
					schema: z.enum(
						schema._zod.def.options.flatMap((op) => {
							const def = op.def.shape[src._zod.def.discriminator].def;
							if (def.type === "enum") {
								return Object.keys(def.entries);
							} else if (def.type === "literal") {
								return def.values;
							}
							return [];
						}),
					),
					type: "discriminator",
				};

				// the resulting sub-questions
				const subQuestions: FlatQuestion[] = [];

				const discriminatorKey = src._zod.def.discriminator;
				const unionData = getValueAtPath(data, path) as any;
				const currentDiscriminatorValue = unionData?.[discriminatorKey];

				if (currentDiscriminatorValue) {
					const options = schema._zod.def.options as z.ZodObject<any>[];

					const selectedIndex = options.findIndex((opt) => {
						const discShape = opt.shape[discriminatorKey];
						const val = (discShape as any)?.def?.values?.[0];
						return val === currentDiscriminatorValue;
					});

					if (selectedIndex !== -1) {
						// Get the schema for the selected branch
						const selectedBranchSchema = schema.def.options[selectedIndex];

						// Recursively get questions for the selected branch to avoid cache issues
						const branchQuestions = getFlatQuestions(
							selectedBranchSchema,
							unionData,
						);

						const filteredSub = branchQuestions
							.filter((q) => {
								const lastPath = q.path[q.path.length - 1];
								return lastPath !== discriminatorKey;
							})
							.map((q) => ({
								...q,
								// Remove the option index from path (e.g., [1, "fieldB"] -> ["fieldB"])
								// then prepend the current path
								path: [...path, q.path[q.path.length - 1]],
							}));
						subQuestions.push(...filteredSub);
					}
				}

				return [discriminator, ...subQuestions];
			}
			default: {
				return [];
			}
		}
	});

	const Y = X(schema);

	return Y;
}
