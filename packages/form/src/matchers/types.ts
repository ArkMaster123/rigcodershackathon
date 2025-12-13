import type React from "react";
import type { z } from "zod";

export type HackFormComponentProps<T extends z.ZodTypeAny = z.ZodTypeAny> = {
	schema: T;
	path: (string | number)[];
	// biome-ignore lint/suspicious: ok
	data: any;
	// biome-ignore lint/suspicious: ok
	setValue: (value: any) => void;
	errors?: string[];
	// biome-ignore lint/suspicious: ok
	meta?: any;
	children?: React.ReactNode;
};

export type MatcherComponent = React.ComponentType<HackFormComponentProps>;

export type MatcherFn = (
	schema: z.ZodTypeAny,
	path: (string | number)[],
	// biome-ignore lint/suspicious: ok
	data: any,
) => MatcherComponent | null;

export interface Matcher {
	name: string;
	match: MatcherFn;
	priority: number;
}
