import type { z } from "zod";
import type { Matcher, MatcherComponent } from "./types";

export class MatcherRegistry {
	private matchers: Matcher[] = [];

	register(matcher: Matcher) {
		this.matchers.push(matcher);
		// Sort by priority desc (higher priority first)
		this.matchers.sort((a, b) => b.priority - a.priority);
	}

	find(
		schema: z.ZodTypeAny,
		path: (string | number)[],
		data: any,
	): MatcherComponent | null {
		for (const matcher of this.matchers) {
			const component = matcher.match(schema, path, data);
			if (component) {
				return component;
			}
		}
		return null;
	}

	clone(): MatcherRegistry {
		const registry = new MatcherRegistry();
		registry.matchers = [...this.matchers];
		return registry;
	}
}
