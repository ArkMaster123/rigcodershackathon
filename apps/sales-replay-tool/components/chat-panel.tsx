"use client";

import { MessageSquare } from "lucide-react";
import { useMemo } from "react";
import type { SimulationEvent } from "@/lib/types";

interface ChatPanelProps {
	events: SimulationEvent[];
	currentTime: number;
	onEventClick: (event: SimulationEvent) => void;
}

export function ChatPanel({
	events,
	currentTime,
	onEventClick,
}: ChatPanelProps) {
	const chatMessages = useMemo(() => {
		return events
			.filter(
				(e) =>
					(e.type === "receiveMessage" || e.type === "replyToUser") &&
					e.timestamp <= currentTime,
			)
			.sort((a, b) => a.timestamp - b.timestamp);
	}, [events, currentTime]);

	return (
		<div className="flex h-full w-80 flex-col border-r border-border bg-card">
			<div className="flex items-center gap-2 border-b border-border px-4 py-3">
				<MessageSquare className="h-4 w-4 text-muted-foreground" />
				<h2 className="text-sm font-semibold text-foreground">User Chat</h2>
				<span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
					{chatMessages.length}
				</span>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				<div className="space-y-3">
					{chatMessages.length === 0 ? (
						<div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
							No messages yet
						</div>
					) : (
						chatMessages.map((msg, idx) => {
							const isUserMessage = msg.type === "receiveMessage";
							return (
								<button
									key={idx}
									onClick={() => onEventClick(msg)}
									className={`w-full text-left ${isUserMessage ? "flex justify-start" : "flex justify-end"}`}
								>
									<div
										className={`max-w-[85%] rounded-lg px-3 py-2 text-sm transition-colors hover:opacity-80 ${
											isUserMessage
												? "bg-secondary text-foreground"
												: "bg-primary text-primary-foreground"
										}`}
									>
										<div className="break-words">
											{msg.content || "(empty message)"}
										</div>
										<div
											className={`mt-1 text-xs ${
												isUserMessage
													? "text-muted-foreground"
													: "text-primary-foreground/70"
											}`}
										>
											{(msg.timestamp / 1000).toFixed(2)}s
										</div>
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
