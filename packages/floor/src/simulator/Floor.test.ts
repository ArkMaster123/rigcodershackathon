import "@hack/test-utils/test-log";

import { describe, expect, test, beforeEach, mock } from "bun:test";
import { Floor } from "./Floor";
import { FloorAgent } from "./Agent";
import type { FloorEvent, AgentConfig } from "./types";

// Mock FloorAgent for testing
class MockAgent extends FloorAgent {
	async processEvent(event: FloorEvent, history: FloorEvent[]): Promise<FloorEvent | null> {
		return null;
	}
}

describe("Floor", () => {
	let floor: Floor;
	let mockAgent1: MockAgent;
	let mockAgent2: MockAgent;

	beforeEach(() => {
		floor = new Floor();
		mockAgent1 = new MockAgent({
			id: "agent1",
			systemPrompt: "Test agent 1",
			model: "test-model",
		});
		mockAgent2 = new MockAgent({
			id: "agent2",
			systemPrompt: "Test agent 2",
			model: "test-model",
		});
	});

	describe("Agent Registration", () => {
		test("should register an agent and return mailbox", () => {
			const mailbox = floor.registerAgent(mockAgent1);

			expect(mailbox).toBeDefined();
			expect(mailbox.mailbox).toBeDefined();
			expect(mailbox.globalBus).toBeDefined();
		});

		test("should register multiple agents", () => {
			const mailbox1 = floor.registerAgent(mockAgent1);
			const mailbox2 = floor.registerAgent(mockAgent2);

			expect(mailbox1).toBeDefined();
			expect(mailbox2).toBeDefined();
		});
	});

	describe("Event Dispatching", () => {
		test("should broadcast event when no targetId is specified", async () => {
			floor.registerAgent(mockAgent1);
			floor.registerAgent(mockAgent2);

			const event: FloorEvent = {
				timestamp: Date.now(),
				type: "sendToFloor",
				actorId: "user",
				content: "Hello everyone!",
			};

			floor.dispatch(event);

			// Event should be in the log
			const log = floor.getLog();
			expect(log).toHaveLength(1);
			expect(log[0]).toEqual(event);
		});

		test("should send direct message when targetId is specified", async () => {
			const mailbox = floor.registerAgent(mockAgent1);

			const event: FloorEvent = {
				timestamp: Date.now(),
				type: "replyToAgent",
				actorId: "agent2",
				targetId: "agent1",
				content: "Direct message to agent1",
			};

			floor.dispatch(event);

			// Event should be in the log
			const log = floor.getLog();
			expect(log).toHaveLength(1);
			expect(log[0]).toEqual(event);
		});

		test("should warn when dispatching to non-existent agent", () => {
			const consoleWarnSpy = mock(console.warn);

			const event: FloorEvent = {
				timestamp: Date.now(),
				type: "replyToAgent",
				actorId: "agent1",
				targetId: "nonexistent",
				content: "Message to nobody",
			};

			floor.dispatch(event);

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"[Floor] No agent found with id: nonexistent. Event dropped."
			);
		});
	});

	describe("Event Logging", () => {
		test("should log all dispatched events", () => {
			floor.registerAgent(mockAgent1);

			const event1: FloorEvent = {
				timestamp: Date.now(),
				type: "sendToFloor",
				actorId: "user",
				content: "First message",
			};

			const event2: FloorEvent = {
				timestamp: Date.now() + 100,
				type: "sendToFloor",
				actorId: "user",
				content: "Second message",
			};

			floor.dispatch(event1);
			floor.dispatch(event2);

			const log = floor.getLog();
			expect(log).toHaveLength(2);
			expect(log[0]).toEqual(event1);
			expect(log[1]).toEqual(event2);
		});

		test("should return empty log for new floor", () => {
			const log = floor.getLog();
			expect(log).toEqual([]);
		});
	});

	describe("Floor Time", () => {
		test("should track floor time since start", async () => {
			const startTime = floor.getFloorTime();
			expect(startTime).toBeGreaterThanOrEqual(0);

			// Wait a bit
			await new Promise(resolve => setTimeout(resolve, 10));

			const laterTime = floor.getFloorTime();
			expect(laterTime).toBeGreaterThan(startTime);
		});
	});

	describe("Floor Lifecycle", () => {
		test("should close without errors", async () => {
			floor.registerAgent(mockAgent1);
			floor.registerAgent(mockAgent2);

			await expect(floor.close()).resolves.toBeUndefined();
		});
	});

	describe("Visualizer Output", () => {
		test("should export event log to JSON file for visualizer", async () => {
			floor.registerAgent(mockAgent1);
			floor.registerAgent(mockAgent2);

			// Simulate a conversation flow
			const events: FloorEvent[] = [
				{
					timestamp: Date.now(),
					type: "receiveMessage",
					actorId: "user",
					content: "I need pricing for oak lumber",
				},
				{
					timestamp: Date.now() + 100,
					type: "sendToFloor",
					actorId: "salesAgent",
					content: "Need timber specialist for oak pricing",
				},
				{
					timestamp: Date.now() + 200,
					type: "acceptFromQueue",
					actorId: "agent1",
					content: "Taking oak pricing task",
				},
				{
					timestamp: Date.now() + 300,
					type: "replyToAgent",
					actorId: "agent1",
					targetId: "salesAgent",
					content: "Oak: $4.50/board foot, 200 units available",
				},
				{
					timestamp: Date.now() + 400,
					type: "replyToUser",
					actorId: "salesAgent",
					content: "Oak lumber is $4.50 per board foot with 200 units in stock",
				},
			];

			// Dispatch all events
			for (const event of events) {
				floor.dispatch(event);
			}

			// Get the log and write to file
			const log = floor.getLog();
			const outputPath = `/tmp/floor-test-${Date.now()}.json`;
			await Bun.write(outputPath, JSON.stringify(log, null, 2));

			// Verify file was created and contains correct data
			const fileContent = await Bun.file(outputPath).text();
			const parsedLog = JSON.parse(fileContent);

			expect(parsedLog).toHaveLength(5);
			expect(parsedLog[0].type).toBe("receiveMessage");
			expect(parsedLog[4].type).toBe("replyToUser");

			console.log(`[Test] Event log written to: ${outputPath}`);
		});
	});

	describe("Integration Tests", () => {
		test("should handle mixed broadcast and direct messages", () => {
			floor.registerAgent(mockAgent1);
			floor.registerAgent(mockAgent2);

			const broadcastEvent: FloorEvent = {
				timestamp: Date.now(),
				type: "sendToFloor",
				actorId: "user",
				content: "Broadcast message",
			};

			const directEvent: FloorEvent = {
				timestamp: Date.now() + 100,
				type: "replyToAgent",
				actorId: "agent1",
				targetId: "agent2",
				content: "Direct message",
			};

			floor.dispatch(broadcastEvent);
			floor.dispatch(directEvent);

			const log = floor.getLog();
			expect(log).toHaveLength(2);
			expect(log[0].targetId).toBeUndefined();
			expect(log[1].targetId).toBe("agent2");
		});

		test("should handle urgent events", () => {
			floor.registerAgent(mockAgent1);

			const urgentEvent: FloorEvent = {
				timestamp: Date.now(),
				type: "sendToFloor",
				actorId: "user",
				urgent: true,
				content: "Urgent message",
			};

			floor.dispatch(urgentEvent);

			const log = floor.getLog();
			expect(log[0].urgent).toBe(true);
		});

		test("should handle events with state snapshots", () => {
			floor.registerAgent(mockAgent1);

			const eventWithState: FloorEvent = {
				timestamp: Date.now(),
				type: "logState",
				actorId: "agent1",
				stateSnapshot: {
					currentTask: "pricing",
					itemCount: 5,
				},
			};

			floor.dispatch(eventWithState);

			const log = floor.getLog();
			expect(log[0].stateSnapshot).toEqual({
				currentTask: "pricing",
				itemCount: 5,
			});
		});
	});
});
