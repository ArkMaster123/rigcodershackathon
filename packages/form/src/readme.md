Here is the README.md for @hack/form, structured to clearly explain the mental model and usage of the library.
@hack/form

The deterministic, schema-driven form engine.

@hack/form is a headless, platform-agnostic library that turns Zod schemas into multi-step, branching data collection flows. Unlike traditional form libraries that manage static state, @hack/form acts as a state machine: it calculates the "next required action" based purely on your schema structure and the current data.
Why @hack/form?

    Schema is Truth: Define pagination, grouping, and conditional branching entirely within Zod. No separate "wizard config" objects.

    Deterministic Flow: The engine calculates the current cursor position via f(Schema, Data). It works the same for a Web UI as it does for an AI Agent.

    Headless & Adapter-Based: Use the core engine anywhere. Use @hack/form/react for the web, or use the core directly to drive conversational LLM flows.

    Flexible UI Injection: A robust "Matcher" system allows you to inject any UI component set (ShadCN, MUI, plain HTML) based on schema types or metadata.

Installation
Bash

npm install @hack/form zod

Quick Start (React)
1. Define your Schema (The Flow)

We use z.tuple to define "Pages" and z.discriminatedUnion for logic branches.
TypeScript

import { z } from "zod";

const formSchema = z.tuple([
  // Page 1: Basic Info
  z.object({
    name: z.string(),
    age: z.number().min(18),
  }),
  
  // Page 2: Branching Logic
  z.discriminatedUnion("type", [
    z.object({ 
      type: z.literal("personal"), 
      hobbies: z.string() 
    }),
    z.object({ 
      type: z.literal("business"), 
      companyName: z.string(), 
      vatId: z.string() 
    }),
  ]),
]);

2. Define Matchers (The UI)

Tell the engine how to render types.
TypeScript

import { Matcher } from "@hack/form";

export const objectMatcher: Matcher = {
  name: "default-object",
  priority: -1,
  match: (schema) => {
    if (isObject(schema)) return ObjectContainer;
    return null;
  }
};

export const discriminatedUnionMatcher: Matcher = {
  name: "default-discriminated-union",
  priority: -1,
  match: (schema) => {
    if (schema instanceof z.ZodDiscriminatedUnion) return DiscriminatedUnionContainer;
    return null;
  }
}

const myMatchers: Matcher[] = [
  opjectMatcher, discriminatedUnionMatcher
];

3. The Hook

Connect it all in your component.
TypeScript

import { useHackForm } from "@hack/form/react";

export default function Wizard() {
  const { 
    render,      // The component tree for the CURRENT step
    next,        // Function to go to next page
    back,        // Function to go back
    isLastPage,  
    submit       // Function to finalize data
  } = useHackForm(formSchema, myMatchers);

  return (
    <div className="wizard-container">
      {render()}
      
      <div className="controls">
        <button onClick={back}>Back</button>
        {isLastPage ? (
          <button onClick={submit}>Submit</button>
        ) : (
          <button onClick={next}>Next</button>
        )}
      </div>
    </div>
  );
}

Core Concepts
1. Pagination (z.tuple)

The engine treats the top-level z.tuple as distinct steps.

    Index 0 is Page 1.

    Index 1 is Page 2.

    The engine will not allow the user to proceed to index 1 until index 0 is fully valid.

2. Branching (z.discriminatedUnion)

When the engine encounters a union, it pauses.

    Implicit Decision Node: If the discriminator (e.g., type) is undefined, the engine asks for it specifically.

    Branching: Once type is set to "business", the engine swaps the schema requirements to match the "business" object.

3. Matchers

Matchers are functions: (schema, path) => Component | null.

    Leaf Nodes: Match ZodString, ZodNumber to inputs.

    Container Nodes: Match ZodObject to layout components (Cards, Grids). The engine passes a renderChild prop to these containers so they can control where the fields appear.

Adapters
React (@hack/form/react)

Standard hook implementation. Handles state, re-renders, and component injection.
LLM / AI (@hack/form/core)

Because the core is headless, you can use it to drive a Chatbot.

    Feed current schema cursor to LLM.

    LLM generates a question.

    User replies -> LLM extracts JSON -> Update Store.

    Engine calculates next step -> Repeat.

Limitations / Roadmap

    Dynamic Arrays: Currently z.array (dynamic length lists) is not supported. Lists must be fixed length (Tuples) or Objects.

    Async Validation: Server-side validation states are currently in development.

License

MIT