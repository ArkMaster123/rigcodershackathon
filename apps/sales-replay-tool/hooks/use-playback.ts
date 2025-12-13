"use client";

import { useEffect, useMemo, useState } from "react";
import type { SimulationEvent } from "@/lib/types";

export function usePlayback(events: SimulationEvent[]) {
	const [currentTime, setCurrentTime] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);

	const duration = useMemo(() => {
		if (events.length === 0) return 0;
		return Math.max(...events.map((e) => e.timestamp));
	}, [events]);

	const activeEvents = useMemo(() => {
		return events.filter((e) => e.timestamp <= currentTime);
	}, [events, currentTime]);

	// Reset playback when events change (new file uploaded)
	useEffect(() => {
		if (events.length === 0) {
			setCurrentTime(0);
		} else {
			const firstEventTime = Math.min(...events.map((e) => e.timestamp));
			setCurrentTime(firstEventTime);
		}
		setIsPlaying(false);
	}, [events]);

	useEffect(() => {
		if (!isPlaying) return;

		const interval = setInterval(() => {
			setCurrentTime((prev) => {
				const next = prev + 16 * playbackSpeed; // 60fps
				if (next >= duration) {
					setIsPlaying(false);
					return duration;
				}
				return next;
			});
		}, 16);

		return () => clearInterval(interval);
	}, [isPlaying, playbackSpeed, duration]);

	const togglePlayback = () => setIsPlaying(!isPlaying);
	const reset = () => {
		setCurrentTime(0);
		setIsPlaying(false);
	};

	return {
		currentTime,
		isPlaying,
		duration,
		activeEvents,
		playbackSpeed,
		setCurrentTime,
		togglePlayback,
		reset,
		setPlaybackSpeed,
	};
}
