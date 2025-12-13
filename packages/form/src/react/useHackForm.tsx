import { useCallback, useMemo, useState } from "react";
import type { z } from "zod";
import { deriveState } from "../core/engine";
import { getFlatQuestions } from "../core/flatten";
import type { Matcher } from "../matchers/types";
import { HackContext, type HackFormContextValue } from "./context";
import { defaultRegistry } from "./defaultMatchers";
import { Renderer } from "./Renderer";

export function useHackForm<T extends z.ZodTypeAny>(
	schema: T,
	initialData: unknown = {},
	customMatchers: Matcher[] = [],
) {
	const [data, setData] = useState(initialData);

	// Initialize Registry
	const matchers = useMemo(() => {
		const registry = defaultRegistry.clone();
		for (const m of customMatchers) {
			registry.register(m);
		}
		return registry;
	}, [customMatchers]);

	// Derive State
	// In a real app, you might debounce this or use `useMemo` carefully.
	// `deriveState` should be memoized inside the engine, but here we just call it.
	const state = useMemo(() => {
		return deriveState(schema, data);
	}, [schema, data]);

	// Get flat questions for rendering
	const flatQuestions = useMemo(() => {
		return getFlatQuestions(schema, data);
	}, [schema, data]);

	const setValue = useCallback((path: (string | number)[], value: unknown) => {
		setData((prev: unknown) => {
			// If path is empty, we are replacing the root data
			if (path.length === 0) {
				return value;
			}

			// Deep set
			// A simple recursive cloner or using a lib like immer is better.
			// Quick & Dirty implementation:
			const clone = JSON.parse(JSON.stringify(prev)); // Warning: Slow/Lossy
			let current = clone;
			for (let i = 0; i < path.length - 1; i++) {
				const key = path[i];
				if (current[key] === undefined) current[key] = {};
				current = current[key];
			}
			current[path[path.length - 1]] = value;
			return clone;
		});
	}, []);

	const next = useCallback(() => {
		// TODO: Implement next
	}, []);

	const back = useCallback(() => {
		// TODO: Implement history or navigation override
	}, []);

	const getQuestionNumber = useCallback(
		(path: (string | number)[]) => {
			const pathStr = path.join(".");
			const index = state.activeQuestions.indexOf(pathStr);
			return index >= 0 ? index + 1 : null;
		},
		[state.activeQuestions],
	);

	const contextValue: HackFormContextValue = {
		...state,
		data,
		setValue,
		next,
		back,
		matchers,
		getQuestionNumber,
	};

	const render = () => {
		return (
			<HackContext.Provider value={contextValue}>
				{flatQuestions.map((question) => (
					<Renderer
						key={question.path.join(".")}
						schema={question.schema}
						path={question.path}
					/>
				))}
			</HackContext.Provider>
		);
	};

	return {
		...state,
		data,
		render,
		setValue,
	};
}
