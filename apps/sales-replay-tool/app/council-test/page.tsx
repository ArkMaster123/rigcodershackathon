"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, MessageSquare, CheckCircle2, Users, Database, Bot } from "lucide-react";

interface LiveKitResponse {
	success: boolean;
	event: {
		timestamp: number;
		type: string;
		actorId: string;
		content: string;
		stateSnapshot?: {
			source: string;
			sessionId: string;
			roomName: string;
		};
	};
	callAgentResponse: {
		type: string;
		content: string;
	};
	specialistResponses: Array<{
		actorId: string;
		type: string;
		content: string;
		toolCalls: Array<{ toolName: string; args: any }>;
	}>;
	finalResponse: {
		type: string;
		content: string;
	};
	message: string;
}

export default function CouncilTestPage() {
	const [loading, setLoading] = useState(false);
	const [response, setResponse] = useState<LiveKitResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	const testMessage = "I want some new wardrobe";

	const handleTest = async () => {
		setLoading(true);
		setError(null);
		setResponse(null);

		try {
			const res = await fetch("/api/livekit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: testMessage,
					participantId: "customer-001",
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to send message");
			}

			const data: LiveKitResponse = await res.json();
			setResponse(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto py-8 px-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-4xl font-bold mb-2">LiveKit Council Test</h1>
					<p className="text-muted-foreground">
						Test sending a message as if from LiveKit to the agent council
					</p>
				</div>
				<Badge variant="outline" className="gap-2">
					<Phone className="h-3 w-3" />
					LiveKit Simulation
				</Badge>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Test Panel */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Phone className="h-5 w-5" />
							LiveKit Message
						</CardTitle>
						<CardDescription>
							Simulate a customer message from LiveKit
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-lg border bg-muted p-4">
							<div className="text-sm font-medium mb-2">Customer Message:</div>
							<div className="text-sm italic text-muted-foreground">
								"{testMessage}"
							</div>
						</div>

						<Button
							onClick={handleTest}
							disabled={loading}
							className="w-full"
						>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Sending to LiveKit Route...
								</>
							) : (
								<>
									<MessageSquare className="mr-2 h-4 w-4" />
									Send to LiveKit Route
								</>
							)}
						</Button>

						{error && (
							<div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Response Panel */}
				{response && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CheckCircle2 className="h-5 w-5 text-green-500" />
								Agent Council Response
							</CardTitle>
							<CardDescription>
								Processed through multi-agent system
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Final Response */}
							<div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4">
								<div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-2">
									<Bot className="h-3 w-3" />
									Final Response to Customer
								</div>
								<div className="text-sm font-medium mt-2">{response.finalResponse.content}</div>
								<Badge variant="outline" className="mt-2 text-xs">
									{response.finalResponse.type}
								</Badge>
							</div>

							{/* Call Agent Response */}
							<div className="space-y-2">
								<div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
									<Phone className="h-3 w-3" />
									Call Agent
								</div>
								<div className="text-sm pl-5 border-l-2">{response.callAgentResponse.content}</div>
								<Badge variant="outline" className="text-xs">{response.callAgentResponse.type}</Badge>
							</div>

							{/* Specialist Responses */}
							{response.specialistResponses.length > 0 && (
								<div className="space-y-3 pt-2 border-t">
									<div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
										<Users className="h-3 w-3" />
										Specialist Agents ({response.specialistResponses.length})
									</div>
									{response.specialistResponses.map((resp, idx) => (
										<div key={idx} className="pl-5 border-l-2 space-y-1">
											<div className="text-xs font-semibold">{resp.actorId}</div>
											<div className="text-sm text-muted-foreground">{resp.content}</div>
											{resp.toolCalls.length > 0 && (
												<div className="flex items-center gap-2 mt-1">
													<Database className="h-3 w-3 text-blue-500" />
													<span className="text-xs text-blue-600 dark:text-blue-400">
														{resp.toolCalls.length} tool call{resp.toolCalls.length !== 1 ? "s" : ""}: {resp.toolCalls.map(tc => tc.toolName).join(", ")}
													</span>
												</div>
											)}
											<Badge variant="outline" className="text-xs">{resp.type}</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			{/* Flow Diagram */}
			<Card>
				<CardHeader>
					<CardTitle>Message Flow</CardTitle>
					<CardDescription>
						How the message flows through the system
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center gap-4 py-8">
						<div className="flex flex-col items-center gap-2">
							<div className="rounded-full bg-blue-500 p-4 text-white">
								<Phone className="h-6 w-6" />
							</div>
							<div className="text-sm font-medium">LiveKit</div>
							<div className="text-xs text-muted-foreground">Customer Call</div>
						</div>

						<div className="text-2xl">→</div>

						<div className="flex flex-col items-center gap-2">
							<div className="rounded-full bg-green-500 p-4 text-white">
								<MessageSquare className="h-6 w-6" />
							</div>
							<div className="text-sm font-medium">API Route</div>
							<div className="text-xs text-muted-foreground">/api/livekit</div>
						</div>

						<div className="text-2xl">→</div>

						<div className="flex flex-col items-center gap-2">
							<div className="rounded-full bg-purple-500 p-4 text-white">
								<CheckCircle2 className="h-6 w-6" />
							</div>
							<div className="text-sm font-medium">Agent Council</div>
							<div className="text-xs text-muted-foreground">Processing</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
