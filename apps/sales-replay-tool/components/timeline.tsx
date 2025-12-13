"use client";

import React, { useEffect } from "react";
import { useCallback, useRef, useState } from "react";

import type { SimulationEvent } from "@/lib/types";

interface TimelineProps {
	events: SimulationEvent[];
	currentTime: number;
	duration: number;
	startTime: number;
	onSeek: (time: number) => void;
}

export function Timeline({
	events,
	currentTime,
	duration,
	startTime,
	onSeek,
}: TimelineProps) {
	const timeRange = duration - startTime;
	const timelineRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const updateTimeFromPosition = useCallback(
		(clientX: number) => {
			if (!timelineRef.current) return;
			const rect = timelineRef.current.getBoundingClientRect();
			const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
			const percentage = x / rect.width;
			onSeek(startTime + percentage * timeRange);
		},
		[startTime, timeRange, onSeek],
	);

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		setIsDragging(true);
		updateTimeFromPosition(e.clientX);
	};

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (isDragging) {
				updateTimeFromPosition(e.clientX);
			}
		},
		[isDragging, updateTimeFromPosition],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	useEffect(() => {
		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	return (
		<div className="space-y-3">
			<div
				ref={timelineRef}
				className="relative h-12 cursor-pointer rounded bg-secondary"
				onMouseDown={handleMouseDown}
			>
				{/* Event markers */}
				{events.map((event, idx) => {
					const position = ((event.timestamp - startTime) / timeRange) * 100;
					return (
						<div
							key={idx}
							className={`absolute top-0 h-full w-0.5 ${event.urgent ? "bg-destructive" : "bg-muted-foreground/30"}`}
							style={{ left: `${position}%` }}
							title={event.type}
						/>
					);
				})}

				{/* Playhead */}
				<div
					className="absolute top-0 h-full w-0.5 bg-primary"
					style={{ left: `${((currentTime - startTime) / timeRange) * 100}%` }}
				>
					<div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-primary" />
				</div>

				{/* Progress fill */}
				<div
					className="h-full rounded bg-primary/20"
					style={{ width: `${((currentTime - startTime) / timeRange) * 100}%` }}
				/>
			</div>
		</div>
	);
}
