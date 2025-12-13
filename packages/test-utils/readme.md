# Test Utilities (`@hack/test-utils`)

This package provides shared utilities specifically for setting up the testing environment across the monorepo.

## Purpose

Currently, its primary function is to initialize a console logger for tests using `slf4ts`.

## Key Components

*   **`test-log.ts`:**
    *   Imports `slf4ts-api` and `slf4ts-console`.
    *   Registers a `ConsoleLoggerBinding`.
    *   Initializes the `LoggerFactory`.
    *   **Important:** This script is designed to be imported at the very beginning of a test setup (e.g., in Jest's `setupFilesAfterEnv`) to ensure logging is configured before any application code that might use the logger runs.

## Integration

*   **Testing Framework (e.g., Jest):** Test configurations across other packages should import `test-log.ts` (or the package itself, relying on side effects if configured) early in their setup process.
*   **Logging Library:** Relies on `slf4ts-api` and `slf4ts-console`.

## Usage

In your Jest configuration (`jest.config.js` or similar):

```javascript
module.exports = {
  // ... other config
  setupFilesAfterEnv: ['<rootDir>/path/to/packages/test-utils/test-log.ts'],
  // or if using module resolution:
  // setupFilesAfterEnv: ['@hack/test-utils/test-log'],
  // ... other config
};
```

Or, if relying on import side effects (less explicit):

```typescript
// In a central test setup file (e.g., setupTests.ts)
import "@hack/test-utils"; // Assuming package.json points main/module to test-log.ts or index.ts imports it

// ... other setup
```

This package ensures consistent console logging is available during test execution across the project.