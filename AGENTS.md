# AGENTS.md

## Commands
- **Format**: `pnpm fmt` (uses Biome)
- **Lint**: `pnpm turbo lint` or per-package `pnpm lint:apply`
- **Typecheck**: `pnpm turbo typecheck`
- **Test all**: `pnpm turbo test`
- **Single test**: `cd packages/<pkg> && bun test <file>` (e.g., `bun test src/core/engine.test.ts`)
- **Full check**: `pnpm turbo check` (runs fmt, lint, test, typecheck)

## Architecture
- **Monorepo** using pnpm workspaces + Turborepo
- **Apps**: `apps/sales-floor`, `apps/sales-replay-tool`, `apps/site`
- **Packages**: `packages/floor` (core), `packages/agents` (AI), `packages/form`, `packages/test-utils`
- **Database**: Drizzle ORM with Postgres (`drizzle:push`, `drizzle:studio`, `drizzle:migrate`)
- **AI SDKs**: Anthropic, Google (Gemini), OpenAI via Vercel AI SDK

## Code Style
- TypeScript with ESM modules (`"type": "module"`)
- Biome for formatting and linting (no Prettier/ESLint)
- Zod for schema validation
- Test files: `*.test.ts`, run with Bun
- Prefer workspace packages: `@hack/floor`, `@hack/form`, `@hack/test-utils`
