"use client";

import {
	Calendar,
	Hammer,
	Loader2,
	MessageSquare,
	Phone,
	User,
	Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { SimulationEvent } from "@/lib/types";

interface AgentRoomProps {
	events: SimulationEvent[];
	activeEvents: SimulationEvent[];
	currentTime: number;
	onAgentClick: (agentId: string) => void;
	onEventClick: (event: SimulationEvent) => void;
}

const agentConfig = {
	user: { name: "User", icon: User, color: "bg-blue-500" },
	phone: { name: "Phone Agent", icon: Phone, color: "bg-chart-1" },
	timber: { name: "Timber Expert", icon: Hammer, color: "bg-chart-2" },
	schedule: { name: "Schedule Expert", icon: Calendar, color: "bg-chart-3" },
	design: { name: "Design Expert", icon: Users, color: "bg-chart-4" },
};

export function AgentRoom({
	events,
	activeEvents,
	currentTime,
	onAgentClick,
	onEventClick,
}: AgentRoomProps) {
	// Extract unique agents from events
	const agents = useMemo(() => {
		const agentSet = new Set<string>();
		events.forEach((event) => {
			agentSet.add(event.actorId);
			if (event.targetId) agentSet.add(event.targetId);
		});
		return Array.from(agentSet);
	}, [events]);

	// Get queue messages (messages waiting to be picked up)
	const queueMessages = useMemo(() => {
		const sentToFloor = activeEvents.filter(
			(e) => e.type === "sendToFloor" && e.timestamp <= currentTime,
		);

		// Get all accepted message IDs
		const acceptedMessageIds = new Set(
			activeEvents
				.filter(
					(e) => e.type === "acceptFromQueue" && e.timestamp <= currentTime,
				)
				.map((e) => e.messageId)
				.filter(Boolean),
		);

		// Only show messages that haven't been accepted yet
		return sentToFloor.filter((msg) => !acceptedMessageIds.has(msg.messageId));
	}, [activeEvents, currentTime]);

	const [processingAgents, setProcessingAgents] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		const processing = new Set<string>();
		activeEvents.forEach((event) => {
			if (event.type === "acceptFromQueue" && event.timestamp <= currentTime) {
				// Check if there's a reply within 2 seconds
				const hasReplied = activeEvents.some(
					(e) =>
						(e.type === "replyToAgent" || e.type === "replyToUser") &&
						e.actorId === event.actorId &&
						e.timestamp > event.timestamp &&
						e.timestamp <= currentTime,
				);
				if (!hasReplied) {
					processing.add(event.actorId);
				}
			}
		});
		setProcessingAgents(processing);
	}, [activeEvents, currentTime]);

	const phoneLetterbox = useMemo(() => {
		return activeEvents.filter(
			(e) =>
				(e.type === "replyToUser" || e.type === "replyToAgent") &&
				e.targetId === "phone" &&
				e.timestamp <= currentTime,
		);
	}, [activeEvents, currentTime]);

	return (
		<div className="relative h-full p-8">
			<div className="mx-auto flex max-w-6xl flex-col gap-2">
				{/* Top Row: Phone Agent + Phone Queue */}
				<div className="flex items-center justify-center gap-6">
					<AgentNode
						id="phone"
						name={agentConfig.phone?.name || "Phone Agent"}
						icon={agentConfig.phone?.icon || Phone}
						color={agentConfig.phone?.color || "bg-chart-1"}
						onClick={() => onAgentClick("phone")}
						isProcessing={processingAgents.has("phone")}
					/>
					<div className="rounded-lg border-2 border-dashed border-border bg-card p-4 min-w-[200px]">
						<div className="mb-2 flex items-center gap-2">
							<MessageSquare className="h-3 w-3 text-muted-foreground" />
							<span className="text-xs font-medium text-muted-foreground">
								Phone Agent Queue
							</span>
						</div>
						<div className="space-y-1.5">
							{phoneLetterbox.length === 0 ? (
								<div className="text-center text-xs text-muted-foreground">
									Empty
								</div>
							) : (
								phoneLetterbox.slice(-2).map((msg, idx) => (
									<div
										key={idx}
										onClick={() => onEventClick(msg)}
										className="cursor-pointer rounded border border-border bg-secondary px-2 py-1.5 text-xs hover:bg-accent"
									>
										<div className="font-medium">{msg.type}</div>
										<div className="text-muted-foreground">
											{JSON.stringify(msg.content).substring(0, 25)}...
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>

				{/* Arrow from Phone Agent to Council */}
				<div className="flex justify-center">
					<div className="flex flex-col items-center">
						<div className="h-16 w-0.5 bg-border" />
						<div className="h-0 w-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border" />
					</div>
				</div>

				{/* Bottom Row: Council Section + Global Queue */}
				<div className="flex-1 flex flex-col gap-4">
					<h2 className="text-2xl font-bold text-foreground">
						Council of Agents — The Floor
					</h2>
					<div className="flex gap-6 items-start w-full">
						{/* Left: Council of Agents */}
						<div className="rounded-lg border-2 border-border bg-card/50 p-8 flex-1 max-w-[50vw]">
							<div className="flex items-center justify-center gap-12 flex-wrap">
								{agents
									.filter((id) => id !== "phone" && id !== "user")
									.map((agentId) => {
										const config = agentConfig[
											agentId as keyof typeof agentConfig
										] || {
											name: agentId,
											icon: Users,
											color: "bg-muted",
										};
										return (
											<AgentNode
												key={agentId}
												id={agentId}
												name={config.name}
												icon={config.icon}
												color={config.color}
												onClick={() => onAgentClick(agentId)}
												isProcessing={processingAgents.has(agentId)}
											/>
										);
									})}
							</div>
						</div>

						{/* Right: Global Queue */}
						<div className="rounded-lg border-2 border-dashed border-border bg-card p-6 min-w-[250px]">
							<div className="mb-2 flex items-center gap-2">
								<MessageSquare className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm font-medium text-muted-foreground">
									Global Queue
								</span>
							</div>
							<div className="space-y-2">
								{queueMessages.length === 0 ? (
									<div className="text-center text-sm text-muted-foreground">
										Empty
									</div>
								) : (
									queueMessages.slice(-3).map((msg, idx) => (
										<div
											key={idx}
											onClick={() => onEventClick(msg)}
											className={`cursor-pointer rounded border px-3 py-2 text-xs hover:bg-accent ${
												msg.urgent
													? "border-destructive bg-destructive/10"
													: "border-border bg-secondary"
											}`}
										>
											<div className="font-medium">{msg.type}</div>
											<div className="text-muted-foreground">
												{JSON.stringify(msg.content).substring(0, 30)}...
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Message Animations */}
			<svg className="pointer-events-none absolute inset-0 h-full w-full">
				{activeEvents
					.filter(
						(e) =>
							e.timestamp <= currentTime && e.timestamp > currentTime - 1000,
					)
					.map((event, idx) => (
						<MessagePath key={idx} event={event} />
					))}
			</svg>
		</div>
	);
}

interface AgentNodeProps {
	id: string;
	name: string;
	icon: React.ElementType;
	color: string;
	onClick: () => void;
	isProcessing: boolean;
}

function AgentNode({
	name,
	icon: Icon,
	color,
	onClick,
	isProcessing,
}: AgentNodeProps) {
	return (
		<button
			onClick={onClick}
			className="group relative flex flex-col items-center gap-2 transition-transform hover:scale-105"
		>
			<div
				className={`rounded-full ${color} p-4 text-white shadow-lg group-hover:shadow-xl relative`}
			>
				<Icon className="h-8 w-8" />
				{isProcessing && (
					<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
						<Loader2 className="h-6 w-6 animate-spin text-white" />
					</div>
				)}
			</div>
			<span className="text-sm font-medium text-foreground">{name}</span>
		</button>
	);
}

function MessagePath({ event }: { event: SimulationEvent }) {
	// Simplified message visualization
	return null;
}
