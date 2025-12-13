/**
 * LiveKit Simulation Route
 * 
 * Simulates receiving a message from LiveKit (customer call/chat)
 * Processes through the agent council and returns the final response
 */

import { NextRequest, NextResponse } from "next/server";
import type { FloorEvent } from "@hack/floor";
import {
	CallAgent,
	DesignAgent,
	TimberSpecialist,
	AvailabilityScheduler,
	UpsellCommercial,
	ProjectArchitect,
} from "@hack/agents";

export async function POST(req: NextRequest) {
	try {
		const { message, participantId } = await req.json();

		if (!message || typeof message !== "string") {
			return NextResponse.json(
				{ error: "Message is required" },
				{ status: 400 },
			);
		}

		// 1. Simulate LiveKit receiving customer message
		const livekitEvent: FloorEvent = {
			timestamp: Date.now(),
			type: "receiveMessage",
			actorId: participantId || "customer-001",
			content: message,
			stateSnapshot: {
				source: "livekit",
				sessionId: `session-${Date.now()}`,
				roomName: "sales-floor",
			},
		};

		console.log("📞 LiveKit Event Received:", livekitEvent);

		// 2. Call Agent processes LiveKit message
		const callAgentResponse = await CallAgent.processEvent(livekitEvent, [livekitEvent]);
		
		if (!callAgentResponse) {
			return NextResponse.json({
				success: false,
				error: "Call Agent did not respond",
			}, { status: 500 });
		}

		// 3. If Call Agent broadcasts to floor, process through specialists
		const broadcastEvent: FloorEvent = callAgentResponse.type === "sendToFloor"
			? callAgentResponse
			: {
					timestamp: Date.now() + 100,
					type: "sendToFloor",
					actorId: "callAgent",
					content: `Customer enquiry: ${message}. Need help from specialists.`,
				};

		const history = [livekitEvent, callAgentResponse, broadcastEvent];
		const specialistResponses: FloorEvent[] = [];

		// 4. Process through specialist agents
		const specialists = [
			DesignAgent,
			TimberSpecialist,
			AvailabilityScheduler,
			UpsellCommercial,
			ProjectArchitect,
		];

		for (const agent of specialists) {
			const response = await agent.processEvent(broadcastEvent, history);
			if (response) {
				specialistResponses.push(response);
			}
		}

		// 5. Call Agent synthesizes specialist responses into final answer
		const finalHistory = [...history, ...specialistResponses];
		const finalResponse = await CallAgent.processEvent(
			{
				...broadcastEvent,
				type: "replyToAgent",
				actorId: "designAgent", // Simulate receiving specialist input
				content: specialistResponses.map(r => {
					const contentStr = typeof r.content === "string" ? r.content : JSON.stringify(r.content);
					return `${r.actorId}: ${contentStr}`;
				}).join("\n"),
			},
			finalHistory,
		);

		// 6. Return final response
		const finalContent = finalResponse?.type === "replyToUser"
			? finalResponse
			: callAgentResponse.type === "replyToUser"
				? callAgentResponse
				: {
						type: "replyToUser",
						actorId: "callAgent",
						content: "Thank you for your enquiry. Our specialists are reviewing your request.",
					};

		const responseContent = typeof finalContent.content === "string"
			? finalContent.content
			: JSON.stringify(finalContent.content);

		return NextResponse.json({
			success: true,
			event: livekitEvent,
			callAgentResponse: {
				type: callAgentResponse.type,
				content: typeof callAgentResponse.content === "string"
					? callAgentResponse.content
					: JSON.stringify(callAgentResponse.content),
			},
			specialistResponses: specialistResponses.map(r => ({
				actorId: r.actorId,
				type: r.type,
				content: typeof r.content === "string" ? r.content : JSON.stringify(r.content),
				toolCalls: r.stateSnapshot?.toolCalls || [],
			})),
			finalResponse: {
				type: finalContent.type,
				content: responseContent,
			},
			message: "Message processed through agent council",
		});
	} catch (error) {
		console.error("Error processing LiveKit message:", error);
		return NextResponse.json(
			{
				error: "Failed to process LiveKit message",
				message: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function GET() {
	return NextResponse.json({
		message: "LiveKit Simulation API",
		endpoints: {
			POST: "/api/livekit - Simulate receiving a customer message from LiveKit",
		},
		example: {
			message: "I want some new wardrobe",
			participantId: "customer-001",
		},
	});
}
