import { z } from "zod";

export function unwrap(schema: z.ZodType): z.ZodTypeAny {
	if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
		return unwrap(schema.def.innerType as any);
	}

	return schema;
}

export function isDiscriminatedUnion(
	schema: z.ZodTypeAny,
): schema is z.ZodDiscriminatedUnion<any, any> {
	return schema instanceof z.ZodDiscriminatedUnion;
}

export function isObject(schema: z.ZodTypeAny): schema is z.ZodObject<any> {
	return schema instanceof z.ZodObject;
}

export function isTuple(schema: z.ZodTypeAny): schema is z.ZodTuple<any> {
	return schema instanceof z.ZodTuple;
}

export function hasTag(schema: z.ZodType, ...tag: string[]): boolean {
	const meta = schema.meta();

	// check if any items overlap
	if (Array.isArray(meta?.tags)) {
		return meta.tags.some((t) => tag.includes(t));
	}

	return false;
}

export function hasMeta(schema: z.ZodType, filter: z.ZodTypeAny): boolean {
	const meta = schema.meta();

	if (filter instanceof z.ZodType) {
		return filter.safeParse(meta).success;
	}

	return false;
}
