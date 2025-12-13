export type EventType =
	| "receiveMessage" // message from user to sales agent
	| "sendToFloor" // multicast to sales floor
	| "acceptFromQueue" // floor agent starts working on a task
	| "replyToAgent" // sales floor agent replies to the sales agent
	| "replyToUser" // sales agent replies to the user
	| "logState"; // a general catch-all for logging state changes

export interface FloorEvent {
	timestamp: number;
	type: EventType;
	actorId: string;
	targetId?: string; // If present: Direct Message. If null/undefined: Broadcast
	urgent?: boolean;
	content?: string; // Serialized A2A Message/Task (JSON string)
	stateSnapshot?: Record<string, unknown>;
}

export interface AgentConfig {
	id: string;
	systemPrompt: string;
	model: string;
}
