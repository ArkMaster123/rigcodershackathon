/**
 * It is paramount that we init the logger factory before any other code
 * and imports are hoisted meaning we need to run this via an import.
 */

// import { LoggerBindings, LoggerFactory } from "slf4ts-api";
// import { ConsoleLoggerBinding } from "slf4ts-console/build/packages/slf4ts-console/lib/slf4ts/ConsoleLoggerBinding";

// LoggerBindings.get().registerBinding(new ConsoleLoggerBinding("1.0.0"));
// // @ts-expect-error(arlyon): logger factory is not exported
// LoggerFactory.initialize();
