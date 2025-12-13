import "@hack/test-utils/test-log";

import { describe, expect, test, beforeEach } from "bun:test";
import { Floor, FloorAgent, type FloorEvent } from "@hack/floor";
import { ConversationGuide } from "@hack/agents/src/agents/ConversationGuide";
import { TimberSpecialist } from "@hack/agents/src/agents/TimberSpecialist";
import { ProjectArchitect } from "@hack/agents/src/agents/ProjectArchitect";
import { AvailabilityScheduler } from "@hack/agents/src/agents/AvailabilityScheduler";
import { UpsellCommercial } from "@hack/agents/src/agents/UpsellCommercial";
import { RiskQA } from "@hack/agents/src/agents/RiskQA";

describe("Sales Floor E2E Tests", () => {
    let floor: Floor;

    beforeEach(() => {
        floor = new Floor();
    });

    describe("Basic Multi-Agent Registration", () => {
        test("should register all sales floor agents successfully", () => {
            const mailbox1 = floor.registerAgent(ConversationGuide);
            const mailbox2 = floor.registerAgent(TimberSpecialist);
            const mailbox3 = floor.registerAgent(ProjectArchitect);
            const mailbox4 = floor.registerAgent(AvailabilityScheduler);
            const mailbox5 = floor.registerAgent(UpsellCommercial);
            const mailbox6 = floor.registerAgent(RiskQA);

            expect(mailbox1).toBeDefined();
            expect(mailbox2).toBeDefined();
            expect(mailbox3).toBeDefined();
            expect(mailbox4).toBeDefined();
            expect(mailbox5).toBeDefined();
            expect(mailbox6).toBeDefined();
        });
    });

    describe("Event Flow Simulation", () => {
        test("should handle a simple customer inquiry workflow", async () => {
            // Register agents
            floor.registerAgent(TimberSpecialist);

            class Agent extends FloorAgent {
                waiting: (value: unknown) => void | undefined = undefined;
                done = new Promise(resolve => { this.waiting = resolve });

                constructor() {
                    super({
                        id: "salesAgent",
                        systemPrompt: "Sales agent. You must ask questions to the floor and reply to users.",
                        model: "claude-sonnet-4-5-20250929",
                    });
                }

                async processEvent(event: FloorEvent, history: FloorEvent[]): Promise<FloorEvent | null> {
                    if (event.type !== "replyToAgent") {
                        console.log("ignoring event");

                        return null;
                    }

                    console.log("resolving", this.waiting);
                    this.waiting?.(null);


                    return {
                        type: "replyToUser",
                        actorId: "salesAgent",
                        timestamp: Date.now() + 200,
                        content: event.content,
                    }
                }
            }

            const agent = new Agent();

            floor.registerAgent(agent);

            // Simulate user asking about wood pricing
            const customerInquiry: FloorEvent = {
                timestamp: Date.now(),
                type: "receiveMessage",
                actorId: "user",
                content: "I need pricing for oak lumber",
            };

            floor.dispatch(customerInquiry);

            const specialistResponse: FloorEvent = {
                timestamp: Date.now() + 100,
                type: "sendToFloor",
                actorId: "salesAgent",
                content: "Need timber specialist to give oak pricing",
            };

            floor.dispatch(specialistResponse);

            console.log("waiting!");

            await Promise.race([agent.done, agent.start(), TimberSpecialist.start()])

            const log = floor.getLog();
            const outputPath = `floor-test-${Date.now()}.json`;
            await Bun.write(outputPath, JSON.stringify(log, null, 2));
            console.log(`[Test] Event log written to: ${outputPath}`);
        });

        test("should handle complex multi-agent collaboration", () => {
            // Register all agents
            floor.registerAgent(ConversationGuide);
            floor.registerAgent(TimberSpecialist);
            floor.registerAgent(ProjectArchitect);
            floor.registerAgent(AvailabilityScheduler);

            // Complex customer request
            const complexRequest: FloorEvent = {
                timestamp: Date.now(),
                type: "receiveMessage",
                actorId: "user",
                content: "I want a 12-foot dining table made of walnut, delivered by next Friday",
            };

            floor.dispatch(complexRequest);

            // Timber specialist checks availability
            const timberCheck: FloorEvent = {
                timestamp: Date.now() + 100,
                type: "sendToFloor",
                actorId: "timberSpecialist",
                content: "Walnut available: 150 board feet at $8.50/bf",
                stateSnapshot: {
                    material: "walnut",
                    available: true,
                    price: 8.5,
                },
            };

            floor.dispatch(timberCheck);

            // Architect evaluates design feasibility
            const architectCheck: FloorEvent = {
                timestamp: Date.now() + 200,
                type: "sendToFloor",
                actorId: "projectArchitect",
                content: "12-foot table requires reinforced joinery. Estimated 4 days build time",
                stateSnapshot: {
                    feasible: true,
                    buildDays: 4,
                },
            };

            floor.dispatch(architectCheck);

            // Scheduler checks timeline
            const schedulerCheck: FloorEvent = {
                timestamp: Date.now() + 300,
                type: "sendToFloor",
                actorId: "availabilityScheduler",
                urgent: true,
                content: "Next Friday is tight - only 7 days. With 4-day build, we have minimal buffer",
                stateSnapshot: {
                    deadline: "next Friday",
                    daysAvailable: 7,
                    daysNeeded: 4,
                },
            };

            floor.dispatch(schedulerCheck);

            // Conversation guide synthesizes response
            const finalResponse: FloorEvent = {
                timestamp: Date.now() + 400,
                type: "replyToUser",
                actorId: "conversationGuide",
                content:
                    "We can build your 12-foot walnut dining table. The timeline for next Friday is tight but achievable. Estimated cost: $1,500",
            };

            floor.dispatch(finalResponse);

            const log = floor.getLog();
            expect(log).toHaveLength(5);
            expect(log.some((e) => e.urgent)).toBe(true);
            expect(log.filter((e) => e.type === "sendToFloor")).toHaveLength(3);
            expect(log[log.length - 1].type).toBe("replyToUser");
        });

        test("should handle direct agent-to-agent messaging", () => {
            floor.registerAgent(ConversationGuide);
            floor.registerAgent(TimberSpecialist);
            floor.registerAgent(ProjectArchitect);

            // Guide asks specialist for specific info
            const directQuestion: FloorEvent = {
                timestamp: Date.now(),
                type: "replyToAgent",
                actorId: "conversationGuide",
                targetId: "timberSpecialist",
                content: "What exotic woods do we have in stock?",
            };

            floor.dispatch(directQuestion);

            // Specialist replies directly to guide
            const directAnswer: FloorEvent = {
                timestamp: Date.now() + 100,
                type: "replyToAgent",
                actorId: "timberSpecialist",
                targetId: "conversationGuide",
                content: "Exotic woods in stock: Teak (50bf), Mahogany (80bf), Ebony (12bf)",
            };

            floor.dispatch(directAnswer);

            const log = floor.getLog();
            expect(log).toHaveLength(2);
            expect(log[0].targetId).toBe("timberSpecialist");
            expect(log[1].targetId).toBe("conversationGuide");
        });

        test("should handle queue acceptance workflow", () => {
            floor.registerAgent(TimberSpecialist);
            floor.registerAgent(ProjectArchitect);

            // Broadcast task to floor
            const floorTask: FloorEvent = {
                timestamp: Date.now(),
                type: "sendToFloor",
                actorId: "conversationGuide",
                content: "Need design assessment for custom bookshelf",
            };

            floor.dispatch(floorTask);

            // Architect accepts from queue
            const acceptTask: FloorEvent = {
                timestamp: Date.now() + 100,
                type: "acceptFromQueue",
                actorId: "projectArchitect",
                content: "Taking bookshelf design task",
            };

            floor.dispatch(acceptTask);

            // Architect provides assessment
            const assessment: FloorEvent = {
                timestamp: Date.now() + 200,
                type: "replyToAgent",
                actorId: "projectArchitect",
                targetId: "conversationGuide",
                content: "Bookshelf design feasible. Recommend 3/4 inch plywood with oak veneer",
            };

            floor.dispatch(assessment);

            const log = floor.getLog();
            expect(log).toHaveLength(3);
            expect(log[1].type).toBe("acceptFromQueue");
            expect(log[2].targetId).toBe("conversationGuide");
        });
    });

    describe("State Tracking and Logging", () => {
        test("should track state snapshots across conversation", () => {
            floor.registerAgent(ConversationGuide);
            floor.registerAgent(TimberSpecialist);

            const events: FloorEvent[] = [
                {
                    timestamp: Date.now(),
                    type: "receiveMessage",
                    actorId: "user",
                    content: "I need custom furniture",
                },
                {
                    timestamp: Date.now() + 100,
                    type: "logState",
                    actorId: "conversationGuide",
                    stateSnapshot: {
                        currentPhase: "discovery",
                        topicsDiscussed: ["furniture"],
                    },
                },
                {
                    timestamp: Date.now() + 200,
                    type: "sendToFloor",
                    actorId: "conversationGuide",
                    content: "Need furniture expert input",
                },
                {
                    timestamp: Date.now() + 300,
                    type: "logState",
                    actorId: "timberSpecialist",
                    stateSnapshot: {
                        taskQueue: ["furniture inquiry"],
                        priority: "normal",
                    },
                },
            ];

            for (const event of events) {
                floor.dispatch(event);
            }

            const log = floor.getLog();
            const stateEvents = log.filter((e) => e.stateSnapshot);
            expect(stateEvents).toHaveLength(2);
            expect(stateEvents[0].stateSnapshot?.currentPhase).toBe("discovery");
            expect(stateEvents[1].stateSnapshot?.priority).toBe("normal");
        });

        test("should export complete conversation log for visualization", async () => {
            floor.registerAgent(ConversationGuide);
            floor.registerAgent(TimberSpecialist);
            floor.registerAgent(ProjectArchitect);

            // Simulate a complete customer journey
            const journey: FloorEvent[] = [
                {
                    timestamp: Date.now(),
                    type: "receiveMessage",
                    actorId: "user",
                    content: "I'm interested in building a custom deck",
                },
                {
                    timestamp: Date.now() + 100,
                    type: "sendToFloor",
                    actorId: "conversationGuide",
                    content: "Customer interested in deck construction",
                },
                {
                    timestamp: Date.now() + 200,
                    type: "acceptFromQueue",
                    actorId: "projectArchitect",
                    content: "Taking deck project assessment",
                },
                {
                    timestamp: Date.now() + 300,
                    type: "replyToAgent",
                    actorId: "projectArchitect",
                    targetId: "conversationGuide",
                    content: "Deck feasible. Need lumber estimate from specialist",
                },
                {
                    timestamp: Date.now() + 400,
                    type: "replyToAgent",
                    actorId: "conversationGuide",
                    targetId: "timberSpecialist",
                    content: "What lumber options for 200 sq ft deck?",
                },
                {
                    timestamp: Date.now() + 500,
                    type: "replyToAgent",
                    actorId: "timberSpecialist",
                    targetId: "conversationGuide",
                    content: "Pressure-treated pine: $3/bf, Cedar: $6/bf, Composite: $8/bf",
                    stateSnapshot: {
                        options: 3,
                        priceRange: [3, 8],
                    },
                },
                {
                    timestamp: Date.now() + 600,
                    type: "replyToUser",
                    actorId: "conversationGuide",
                    content:
                        "We can build your deck! Options range from $600-$1600 depending on material choice",
                },
            ];

            for (const event of journey) {
                floor.dispatch(event);
            }

            const log = floor.getLog();
            const outputPath = `floor-test-${Date.now()}.json`;
            await Bun.write(outputPath, JSON.stringify(log, null, 2));

            // Verify log completeness
            expect(log).toHaveLength(7);
            expect(log[0].type).toBe("receiveMessage");
            expect(log[log.length - 1].type).toBe("replyToUser");
            expect(log.filter((e) => e.targetId).length).toBeGreaterThan(0);

            console.log(`[Test] E2E event log written to: ${outputPath}`);
        });
    });

    describe("Error Handling and Edge Cases", () => {
        test("should handle events with missing optional fields", () => {
            floor.registerAgent(ConversationGuide);

            const minimalEvent: FloorEvent = {
                timestamp: Date.now(),
                type: "sendToFloor",
                actorId: "user",
            };

            floor.dispatch(minimalEvent);

            const log = floor.getLog();
            expect(log).toHaveLength(1);
            expect(log[0].content).toBeUndefined();
            expect(log[0].targetId).toBeUndefined();
        });

        test("should track floor time accurately", async () => {
            floor.registerAgent(ConversationGuide);

            const startTime = floor.getFloorTime();

            // Dispatch some events over time
            floor.dispatch({
                timestamp: Date.now(),
                type: "receiveMessage",
                actorId: "user",
                content: "Hello",
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            floor.dispatch({
                timestamp: Date.now(),
                type: "replyToUser",
                actorId: "conversationGuide",
                content: "Hi there!",
            });

            const endTime = floor.getFloorTime();
            expect(endTime).toBeGreaterThan(startTime);
        });

        test("should handle rapid sequential dispatches", () => {
            floor.registerAgent(ConversationGuide);
            floor.registerAgent(TimberSpecialist);
            floor.registerAgent(ProjectArchitect);

            // Rapid-fire events
            for (let i = 0; i < 20; i++) {
                floor.dispatch({
                    timestamp: Date.now() + i,
                    type: "sendToFloor",
                    actorId: i % 2 === 0 ? "timberSpecialist" : "projectArchitect",
                    content: `Event ${i}`,
                });
            }

            const log = floor.getLog();
            expect(log).toHaveLength(20);
            // Verify order is preserved
            for (let i = 0; i < 20; i++) {
                expect(log[i].content).toBe(`Event ${i}`);
            }
        });
    });

    describe("Floor Lifecycle", () => {
        test("should close cleanly with multiple registered agents", async () => {
            floor.registerAgent(ConversationGuide);
            floor.registerAgent(TimberSpecialist);
            floor.registerAgent(ProjectArchitect);
            floor.registerAgent(AvailabilityScheduler);
            floor.registerAgent(UpsellCommercial);
            floor.registerAgent(RiskQA);

            // Dispatch some events
            floor.dispatch({
                timestamp: Date.now(),
                type: "receiveMessage",
                actorId: "user",
                content: "Test message",
            });

            await expect(floor.close()).resolves.toBeUndefined();
        });

        test("should maintain log after close", async () => {
            floor.registerAgent(ConversationGuide);

            floor.dispatch({
                timestamp: Date.now(),
                type: "receiveMessage",
                actorId: "user",
                content: "Test message",
            });

            await floor.close();

            const log = floor.getLog();
            expect(log).toHaveLength(1);
            expect(log[0].content).toBe("Test message");
        });
    });
});
