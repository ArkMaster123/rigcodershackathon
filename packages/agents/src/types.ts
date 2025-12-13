export type MessageType =
	| "receiveMessage"
	| "sendToFloor"
	| "acceptFromQueue"
	| "replyToAgent"
	| "replyToUser";

export interface Message {
	timestamp: number;
	type: MessageType;
	actorId: string;
	content?: string;
	urgent?: boolean;
	stateSnapshot?: Record<string, unknown>;
}

export interface AgentConfig {
	id: string;
	systemPrompt: string;
	model: string;
}
