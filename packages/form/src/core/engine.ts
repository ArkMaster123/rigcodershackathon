import type { ZodSafeParseResult, z } from "zod";

export interface FormState {
	// Identify the list of steps that have been fully completed/validated
	completedSteps: string[];
	// The path to the current "active" field or step that needs attention
	currentCursor: string | null;
	// A list of potential future steps (used for progress bars, etc)
	futureSteps: string[];
	// Whether the entire form flow is complete
	isComplete: boolean;
	// Errors found during validation
	errors: Record<string, string[]>;
	// Ordered array of all active question paths (includes completed, current, and visible sub-questions)
	activeQuestions: string[];
	data: any;
}

export type DeriveStateOptions = {
	// optional config
};

import { getFlatQuestions } from "./flatten";
import { isDiscriminatedUnion, isObject, isTuple, unwrap } from "./traversal";

/**
 * Returns the value at the given path in the data object.
 */
function getValueAtPath(data: unknown, path: (string | number)[]) {
	let current: any = data;
	for (const key of path) {
		if (current === null || current === undefined) return undefined;
		current = current[key];
	}
	return current;
}

export function deriveState<T extends z.ZodTypeAny>(
	schema: T,
	data: unknown,
	options?: DeriveStateOptions,
): FormState {
	const completedSteps: string[] = [];
	const errors: Record<string, string[]> = {};
	const futureSteps: string[] = [];

	// 1. Get the list of active questions (Single Source of Truth)
	const flatQuestions = getFlatQuestions(schema, data);
	const activeQuestions = flatQuestions.map((q) => q.path.join("."));

	// 2. Validate each active question and find the cursor
	let cursor: string | null = null;
	let isComplete = true;

	for (const question of flatQuestions) {
		const value = getValueAtPath(data, question.path);
		const pathStr = question.path.join(".");
		let isValid = false;
		let issues: string[] = [];

		const result = question.schema.safeParse(value);
		if (result.success) {
			isValid = true;
		} else {
			issues = result.error.issues.map((e) => e.message);
		}

		if (!isValid) {
			// Found an error
			errors[pathStr] = issues;

			// If this is the first error, it's our cursor
			if (cursor === null) {
				cursor = pathStr;
			}
			isComplete = false;
		} else {
			completedSteps.push(pathStr);
		}
	}

	// 3. Logic to determine if "0" (step) is complete?
	// Previous logic: if tuple item valid -> completedSteps.push("0")
	// New logic: We don't verify containers explicitly.
	// We can stick to leaf-based validation. "isComplete" flag tells the global story.

	return {
		completedSteps,
		currentCursor: cursor,
		futureSteps, // Empty for now, as flat traversal implies "Active Only"
		isComplete: isComplete && cursor === null,
		errors,
		activeQuestions,
		data: data,
	};
}
