import { anthropic } from "@ai-sdk/anthropic";
import { openrouter } from "@openrouter/ai-sdk-provider";
import {
	type AgentConfig,
	FloorAgent,
	type FloorEvent,
} from "@hack/floor";
import { generateText, tool } from "ai";
import { stockTools } from "./db/tools";
import type { z } from "zod";

// Map agent IDs to their relevant database tools
const AGENT_TOOLS: Record<string, Array<keyof typeof stockTools>> = {
	timberSpecialist: ["checkMaterialAvailability", "getMaterials"],
	designAgent: ["getProducts", "getProductById", "searchProducts"],
	upsellCommercial: ["getProductById", "getServices"],
	availabilityScheduler: ["getLeadTime", "getDecorators", "getServices"],
	projectArchitect: ["getProducts", "getMaterials"],
};

/**
 * Convert stockTools to AI SDK tool format
 */
function createAISDKTools(toolNames: Array<keyof typeof stockTools>) {
	const tools: Record<string, ReturnType<typeof tool>> = {};

	for (const toolName of toolNames) {
		const toolDef = stockTools[toolName];
		tools[toolName] = tool({
			description: toolDef.description,
			parameters: toolDef.parameters as z.ZodObject<any>,
			execute: async (args: any) => {
				try {
					const result = await toolDef.execute(args);
					return {
						success: true,
						data: result,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			},
		});
	}

	return tools;
}

export class LLMAgent extends FloorAgent {
	public config: AgentConfig;
	private availableTools: Record<string, ReturnType<typeof tool>>;

	constructor(config: AgentConfig) {
		super(config);
		this.config = config;

		// Get tools for this agent based on their ID
		const toolNames = AGENT_TOOLS[config.id] || [];
		this.availableTools = createAISDKTools(toolNames);
	}

	public async processEvent(
		event: FloorEvent,
		history: FloorEvent[],
	): Promise<FloorEvent | null> {
		// Only process messages relevant to this agent or general broadcast
		if (event.actorId === this.config.id) return null;

		console.log(
			`[${this.config.id}] Processing event from ${event.actorId}: ${event.type}`,
		);

		// Construct context from history
		const context = history
			.map(
				(m) =>
					`[${new Date(m.timestamp).toISOString()}] ${m.actorId} (${m.type}): ${m.content || ""} ${m.stateSnapshot ? JSON.stringify(m.stateSnapshot) : ""}`,
			)
			.join("\n");

		// Build tool descriptions for the prompt
		const toolNames = Object.keys(this.availableTools);
		const toolDescriptions = toolNames
			.map((toolName) => {
				const toolDef = stockTools[toolName as keyof typeof stockTools];
				return `- ${toolName}: ${toolDef.description}`;
			})
			.join("\n");

		const prompt = `
You are an agent with ID: ${this.config.id}.
Your role is defined as: ${this.config.systemPrompt}

${toolNames.length > 0 ? `\nYou have access to these database tools:\n${toolDescriptions}\n` : ""}

Current conversation history:
${context}

New event to process:
[${new Date(event.timestamp).toISOString()}] ${event.actorId} (${event.type}): ${event.content || ""} ${event.stateSnapshot ? JSON.stringify(event.stateSnapshot) : ""}

Instructions:
${toolNames.length > 0 ? "1. If this message is relevant to your expertise, USE THE AVAILABLE TOOLS to gather information from the database FIRST.\n2. Use tools BEFORE responding - call the appropriate tools to get real data.\n3. After getting tool results, synthesize them into a helpful response.\n4. " : ""}If the message is not relevant to your domain, or you have nothing valuable to add, output "NO_ACTION".
${toolNames.length > 0 ? "5. " : ""}Do not reply just to acknowledge. Only reply if you are adding value based on your specific role${toolNames.length > 0 ? " and the tool data you've gathered" : ""}.

Your response should be a JSON object with:
- type: The type of message to send:
  * If you are a specialist agent (NOT callAgent): Use 'replyToAgent' with targetId set to 'callAgent' - you communicate with Call Agent, NOT directly with the user
  * If you are callAgent: Use 'replyToUser' to send final response to customer, or 'sendToFloor' to request help from specialists
  * Use 'acceptFromQueue' to indicate you're working on a task
- targetId: (REQUIRED for replyToAgent) Set to 'callAgent' if you're a specialist responding to a sendToFloor request
- content: The content of your message${toolNames.length > 0 ? " (include the data you gathered from tools)" : ""}
- stateSnapshot: (Optional) Any state updates
- urgent: (Optional) Boolean if this is a blocker

IMPORTANT: Specialist agents (designAgent, timberSpecialist, etc.) should ALWAYS use replyToAgent with targetId='callAgent'. Only callAgent sends replyToUser to the customer.
`;

		try {
			const response = await generateText({
				model: openrouter(this.config.model),
				prompt: prompt,
				tools: toolNames.length > 0 ? this.availableTools : undefined,
				maxSteps: toolNames.length > 0 ? 5 : 1, // Allow multiple tool calls if tools available
			});

			const text = response.text;

			console.log(`[${this.config.id}] Raw LLM response: ${text}`);
			
			// Log tool calls if any
			if (response.toolCalls && response.toolCalls.length > 0) {
				console.log(
					`[${this.config.id}] 🔧 Tool calls made: ${response.toolCalls.map((tc) => tc.toolName).join(", ")}`,
				);
			}

			if (text.includes("NO_ACTION")) {
				return null;
			}

			// Naive parsing of JSON response from LLM
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const responseData = JSON.parse(jsonMatch[0]);

				// If specialist agent is replying to Call Agent, set targetId
				const isSpecialist = this.config.id !== "callAgent";
				const shouldTargetCallAgent = 
					isSpecialist && 
					(responseData.type === "replyToAgent" || !responseData.type);

				return {
					timestamp: Date.now(),
					type: responseData.type || (shouldTargetCallAgent ? "replyToAgent" : undefined),
					actorId: this.config.id,
					targetId: responseData.targetId || (shouldTargetCallAgent ? "callAgent" : undefined),
					content: responseData.content,
					stateSnapshot: {
						...responseData.stateSnapshot,
						toolCalls: response.toolCalls?.map((tc) => ({
							toolName: tc.toolName,
							args: tc.args,
						})),
					},
					urgent: responseData.urgent, // Pass through urgent flag
				};
			}
		} catch (error) {
			console.error(`[${this.config.id}] Error processing message:`, error);
		}
		return null;
	}
}
