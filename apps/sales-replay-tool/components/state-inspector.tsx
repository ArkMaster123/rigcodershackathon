"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { SimulationEvent } from "@/lib/types";

interface StateInspectorProps {
	selectedAgent: string | null;
	selectedEvent: SimulationEvent | null;
	events: SimulationEvent[];
	currentTime: number;
	onClose: () => void;
}

export function StateInspector({
	selectedAgent,
	selectedEvent,
	events,
	currentTime,
	onClose,
}: StateInspectorProps) {
	const agentState = useMemo(() => {
		if (!selectedAgent) return null;

		// Find all events for this agent up to current time
		const agentEvents = events
			.filter(
				(e) =>
					e.actorId === selectedAgent &&
					e.timestamp <= currentTime &&
					e.stateSnapshot,
			)
			.sort((a, b) => b.timestamp - a.timestamp);

		// Return the most recent state snapshot
		return agentEvents.length > 0 ? agentEvents[0].stateSnapshot : null;
	}, [selectedAgent, events, currentTime]);

	const displayData = selectedEvent || agentState;
	const title = selectedEvent
		? "Event Details"
		: selectedAgent
			? `${selectedAgent} State`
			: "Inspector";

	return (
		<div className="w-96 border-l border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<h3 className="font-semibold text-card-foreground">{title}</h3>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="h-[calc(100vh-200px)] overflow-auto p-4">
				{displayData ? (
					<pre className="rounded-lg bg-secondary p-4 text-xs font-mono text-secondary-foreground">
						{JSON.stringify(displayData, null, 2)}
					</pre>
				) : (
					<div className="text-center text-sm text-muted-foreground">
						No state available
					</div>
				)}
			</div>
		</div>
	);
}
