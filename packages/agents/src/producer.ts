import type { Message } from "./types";

export class Producer {
	private queue: Message[] = [];
	private listeners: ((message: Message) => void)[] = [];

	constructor(initialMessages: Message[] = []) {
		this.queue = [...initialMessages];
	}

	public addMessage(message: Message) {
		this.queue.push(message);
		this.notifyListeners(message);
	}

	public getQueue(): Message[] {
		return this.queue;
	}

	public subscribe(listener: (message: Message) => void) {
		this.listeners.push(listener);
	}

	private notifyListeners(message: Message) {
		for (const listener of this.listeners) {
			listener(message);
		}
	}

	// Simulate processing existing queue for replay purposes
	public async processQueue(processor: (message: Message) => Promise<void>) {
		// Sort by timestamp to ensure correct order
		const sortedQueue = [...this.queue].sort(
			(a, b) => a.timestamp - b.timestamp,
		);

		for (const message of sortedQueue) {
			await processor(message);
		}
	}
}
