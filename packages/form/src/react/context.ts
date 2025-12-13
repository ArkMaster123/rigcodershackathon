import { createContext, useContext } from "react";
import type { FormState } from "../core/engine";
import type { MatcherRegistry } from "../matchers/registry";

export interface HackFormContextValue extends FormState {
	data: any;
	setValue: (path: (string | number)[], value: any) => void;
	next: () => void;
	back: () => void;
	matchers: MatcherRegistry;
	// Helper to get question number for a given path
	getQuestionNumber: (path: (string | number)[]) => number | null;
}

export const HackContext = createContext<HackFormContextValue | null>(null);

export function useHackContext() {
	const context = useContext(HackContext);
	if (!context) {
		throw new Error("useHackContext must be used within a HackFormProvider");
	}
	return context;
}
