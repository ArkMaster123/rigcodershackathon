"use client";

import {
	ChevronsLeft,
	ChevronsRight,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AgentRoom } from "@/components/agent-room";
import { ChatPanel } from "@/components/chat-panel";
import { StateInspector } from "@/components/state-inspector";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { usePlayback } from "@/hooks/use-playback";
import type { SimulationEvent } from "@/lib/types";

interface EventViewerProps {
	events: SimulationEvent[];
	fileName: string;
	onReset: () => void;
}

export function EventViewer({ events, fileName, onReset }: EventViewerProps) {
	const {
		currentTime,
		isPlaying,
		duration,
		activeEvents,
		playbackSpeed,
		setCurrentTime,
		togglePlayback,
		reset,
		setPlaybackSpeed,
	} = usePlayback(events);

	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const [selectedEvent, setSelectedEvent] = useState<SimulationEvent | null>(
		null,
	);

	// Calculate the first event timestamp to show relative times
	const firstEventTime =
		events.length > 0 ? Math.min(...events.map((e) => e.timestamp)) : 0;

	const skipToStart = () => setCurrentTime(firstEventTime);
	const skipToEnd = () => setCurrentTime(duration);

	const skipToNext = () => {
		const nextEvent = events.find((e) => e.timestamp > currentTime);
		if (nextEvent) setCurrentTime(nextEvent.timestamp);
	};

	const skipToPrev = () => {
		const prevEvents = events.filter((e) => e.timestamp < currentTime);
		if (prevEvents.length > 0) {
			const prevEvent = prevEvents[prevEvents.length - 1];
			setCurrentTime(prevEvent.timestamp);
		}
	};

	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.target !== document.body) return;

			if (e.code === "Space") {
				e.preventDefault();
				togglePlayback();
			} else if (e.code === "ArrowLeft") {
				e.preventDefault();
				skipToPrev();
			} else if (e.code === "ArrowRight") {
				e.preventDefault();
				skipToNext();
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [togglePlayback, skipToNext, skipToPrev]);

	return (
		<div className="flex h-screen flex-col bg-background">
			{/* Header */}
			<header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
				<div className="flex items-center gap-4">
					<h1 className="text-lg font-semibold text-card-foreground">
						Multi Agent Sales for Trades
					</h1>
					<span className="text-sm text-muted-foreground">{fileName}</span>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={playbackSpeed}
						onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
						className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
					>
						<option value={0.5}>0.5x</option>
						<option value={1}>1x</option>
						<option value={2}>2x</option>
						<option value={4}>4x</option>
					</select>
					<Button variant="ghost" size="icon" onClick={onReset}>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Chat Panel */}
				<ChatPanel
					events={events}
					currentTime={currentTime}
					onEventClick={setSelectedEvent}
				/>

				{/* Agent Room */}
				<div className="flex-1 overflow-auto">
					<AgentRoom
						events={events}
						activeEvents={activeEvents}
						currentTime={currentTime}
						onAgentClick={setSelectedAgent}
						onEventClick={setSelectedEvent}
					/>
				</div>

				{/* State Inspector */}
				{(selectedAgent || selectedEvent) && (
					<StateInspector
						selectedAgent={selectedAgent}
						selectedEvent={selectedEvent}
						events={events}
						currentTime={currentTime}
						onClose={() => {
							setSelectedAgent(null);
							setSelectedEvent(null);
						}}
					/>
				)}
			</div>

			{/* Timeline Controls */}
			<div className="border-t border-border bg-card">
				<div className="px-6 py-4">
					<Timeline
						events={events}
						currentTime={currentTime}
						duration={duration}
						startTime={firstEventTime}
						onSeek={setCurrentTime}
					/>
				</div>

				<div className="flex items-center justify-between border-t border-border px-6 py-3">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={skipToStart}
							title="Skip to start"
						>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={skipToPrev}
							title="Previous event"
						>
							<SkipBack className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" onClick={togglePlayback}>
							{isPlaying ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4" />
							)}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={skipToNext}
							title="Next event"
						>
							<SkipForward className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={skipToEnd}
							title="Skip to end"
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>

					<div className="text-sm font-mono text-muted-foreground">
						{((currentTime - firstEventTime) / 1000).toFixed(2)}s /{" "}
						{((duration - firstEventTime) / 1000).toFixed(2)}s
					</div>
				</div>
			</div>
		</div>
	);
}
