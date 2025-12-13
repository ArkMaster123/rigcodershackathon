import type { z } from "zod";
import { useHackContext } from "./context";

export const Renderer = ({
	schema,
	path,
}: {
	schema: z.ZodTypeAny;
	path: (string | number)[];
}) => {
	const {
		matchers,
		data,
		setValue,
		errors,
		activeQuestions,
		currentCursor,
		getQuestionNumber,
	} = useHackContext();

	// 1. Resolve Data at Path
	let currentData: any = data;
	for (const key of path) {
		if (currentData == null) break;
		currentData = currentData[key];
	}

	// 2. Resolve Errors at Path
	const pathStr = path.join(".");
	const currentErrors = errors[pathStr];

	// 3. Check if this question should be visible (only up to and including current cursor)
	const questionIndex = activeQuestions.indexOf(pathStr);
	const cursorIndex = currentCursor
		? activeQuestions.indexOf(currentCursor)
		: activeQuestions.length - 1;

	// If this question is beyond the cursor, don't render it
	if (questionIndex > cursorIndex) {
		return null;
	}

	// 4. Get question number
	const questionNumber = getQuestionNumber(path);

	// 5. Find Matcher
	const Component = matchers.find(schema, path, currentData);

	if (!Component) {
		// Fallback or return null?
		throw new Error(`No matcher for ${pathStr} ${JSON.stringify(schema.def)}`);
	}

	// 4. Get metadata
	const meta = schema.meta() ?? { description: schema.description };

	return (
		<Component
			schema={schema}
			path={path}
			data={currentData}
			value={currentData}
			setValue={(val: any) => setValue(path, val)}
			errors={currentErrors}
			meta={meta}
			questionNumber={questionNumber}
			key={path.join(".")}
		/>
	);
};
