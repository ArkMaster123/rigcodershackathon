import { Channel, Multicast } from "queueable";
import type { FloorAgent } from "./Agent";
import type { FloorEvent } from "./types";

export interface AgentMailbox {
	mailbox: Channel<FloorEvent>;
	globalBus: Multicast<FloorEvent>;
}

export class Floor {
	// Global broadcast channel (The "Room" / "Floor")
	private globalBus = new Multicast<FloorEvent>();

	// Private mailboxes for direct addressing
	private agentQueues = new Map<string, Channel<FloorEvent>>();

	// Mailbox subscribers (one per agent for the global bus)
	private agentMailboxes = new Map<string, AgentMailbox>();

	// Agent registry
	private agents = new Map<string, FloorAgent>();

	// Event log for replay
	private eventLog: FloorEvent[] = [];

	// World clock (floor start time)
	private startTime = Date.now();

	/**
	 * Register an agent and create its dedicated mailbox
	 * The agent will automatically start processing events when start() is called
	 */
	public registerAgent(agent: FloorAgent): AgentMailbox {
		const agentId = agent.config.id;
		const mailbox = new Channel<FloorEvent>();

		this.agentQueues.set(agentId, mailbox);
		this.agents.set(agentId, agent);

		const subscriber = this.globalBus[Symbol.asyncIterator]();

		const agentMailbox = {
			mailbox,
			globalBus: subscriber,
		};

		this.agentMailboxes.set(agentId, agentMailbox);

		// Give agent reference to Floor so it can dispatch events
		agent.setFloor(this);

		return agentMailbox;
	}

	public async run(): Promise<void> {
		await Promise.all([...this.agents.values()].map((agent) => agent.start()));
	}

	/**
	 * Get an agent's mailbox (used internally by agents)
	 */
	public getMailbox(agentId: string): AgentMailbox | undefined {
		return this.agentMailboxes.get(agentId);
	}

	/**
	 * Core routing logic:
	 * - If targetId is specified -> Direct Message to specific agent's Channel
	 * - If no targetId -> Broadcast to global Multicast stream
	 */
	public dispatch(event: FloorEvent): void {
		// 1. Log the event immediately
		this.eventLog.push(event);

		// 2. Route based on targetId presence
		if (event.targetId) {
			// Direct Message -> Specific Agent Queue
			const targetQueue = this.agentQueues.get(event.targetId);
			if (targetQueue) {
				targetQueue.push(event);
			} else {
				console.warn(
					`[Floor] No agent found with id: ${event.targetId}. Event dropped.`,
				);
			}
		} else {
			// No Target -> Broadcast to everyone on the floor
			console.log("adding", event)
			this.globalBus.push(event);
		}
	}

	/**
	 * Get the complete event log for replay
	 */
	public getLog(): FloorEvent[] {
		return this.eventLog;
	}

	/**
	 * Get current floor time (ms since start)
	 */
	public getFloorTime(): number {
		return Date.now() - this.startTime;
	}

	/**
	 * Close all channels (cleanup)
	 * Note: queueable channels don't have a close method, so this is a placeholder
	 */
	public async close(): Promise<void> {
		// Cleanup would go here if needed
		// queueable channels are automatically cleaned up by garbage collection
	}
}
