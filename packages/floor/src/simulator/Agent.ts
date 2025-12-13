import type { Floor } from "./Floor";
import type { AgentConfig, FloorEvent } from "./types";

export abstract class FloorAgent {
	protected floor?: Floor;
	private eventHistory: FloorEvent[] = [];

	constructor(public config: AgentConfig) { }

	/**
	 * Called by Floor during registration to provide Floor reference
	 */
	public setFloor(floor: Floor): void {
		this.floor = floor;
	}

	/**
	 * Start the agent's main loop
	 * Agents automatically consume from BOTH:
	 * 1. Their private mailbox (direct messages)
	 * 2. The global bus (broadcast messages)
	 *
	 * Events are automatically passed to processEvent() and results dispatched
	 */
	public async start(): Promise<void> {
		if (!this.floor) {
			throw new Error(
				`Agent ${this.config.id} has not been registered with a Floor`,
			);
		}

		// Run both consumers in parallel
		await Promise.race([
			this.consumeMailbox(),
			this.consumeBroadcast(),
		]);
	}

	/**
	 * Consume direct messages from private mailbox
	 */
	private async consumeMailbox(): Promise<void> {
		if (!this.floor) return;
		const mailbox = this.floor.getMailbox(this.config.id);
		if (!mailbox) return;

		for await (const event of mailbox.mailbox) {
			await this.handleEvent(event);
		}
	}

	/**
	 * Consume broadcast messages from global bus
	 * Agents should filter these based on their expertise
	 */
	private async consumeBroadcast(): Promise<void> {
		if (!this.floor) return;
		const mailbox = this.floor.getMailbox(this.config.id);
		if (!mailbox) return;

		for await (const event of mailbox.globalBus) {
			// Skip messages from self
			if (event.actorId === this.config.id) {
				continue;
			}

			await this.handleEvent(event);
		}
	}

	/**
	 * Handle an event by calling processEvent and dispatching the result
	 */
	private async handleEvent(event: FloorEvent): Promise<void> {
		this.eventHistory.push(event);

		const result = await this.processEvent(event, this.eventHistory);

		if (result && this.floor) {
			this.floor.dispatch(result);
		}
	}

	/**
	 * Abstract method for agents to implement their behavior
	 * This is called for each event (both direct and broadcast)
	 */
	abstract processEvent(
		event: FloorEvent,
		history: FloorEvent[],
	): Promise<FloorEvent | null>;
}
