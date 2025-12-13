"use client";

import { Upload } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { EventViewer } from "@/components/event-viewer";
import { Button } from "@/components/ui/button";
import type { SimulationEvent } from "@/lib/types";

export default function Home() {
	const [events, setEvents] = useState<SimulationEvent[]>([]);
	const [fileName, setFileName] = useState<string>("");

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				setEvents(json);
				setFileName(file.name);
			} catch (error) {
				alert("Invalid JSON file");
			}
		};
		reader.readAsText(file);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				setEvents(json);
				setFileName(file.name);
			} catch (error) {
				alert("Invalid JSON file");
			}
		};
		reader.readAsText(file);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	if (events.length === 0) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background">
				<div
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-border bg-card p-12 text-center transition-colors hover:border-primary/50"
				>
					<Upload className="h-12 w-12 text-muted-foreground" />
					<div>
						<h2 className="text-xl font-semibold text-card-foreground">
							Drop your event log file
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							Or click to browse and select a JSON file
						</p>
					</div>
					<label>
						<input
							type="file"
							accept=".json"
							onChange={handleFileUpload}
							className="hidden"
						/>
						<Button asChild>
							<span>Select File</span>
						</Button>
					</label>
				</div>
			</main>
		);
	}

	return (
		<main className="h-screen bg-background">
			<EventViewer
				events={events}
				fileName={fileName}
				onReset={() => setEvents([])}
			/>
		</main>
	);
}
