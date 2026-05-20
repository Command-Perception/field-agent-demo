# Headless E2E Test System Design

> **Status:** Approved  
> **Date:** 2026-05-20  
> **Project:** field-agent-demo

## Goal

Create a headless end-to-end test system that validates the agent pipeline by calling the Hono API directly and asserting WebSocket events. No browser automation — tests connect to the running Docker Compose stack.

## Architecture

```
Tests (Vitest) ──HTTP──→ Hono API (:3999)
                ──WS────→ WebSocket (:3999/ws)
```

- Tests run against the **live** Docker stack (api + db)
- No mocking of the agent pipeline — real Claude API calls, real PostgreSQL
- WebSocket assertions verify real-time event delivery
- Each test creates + tears down its own visit for isolation

## Test Helper Design

`tests/e2e/helpers.ts`:

```typescript
// Base URL derived from environment or default
function getBaseUrl(): string
function apiUrl(path: string): string

// Typed HTTP client matching our service layer
async function apiRequest<T>(path: string, options?: RequestInit): Promise<T>

// WebSocket connection with auto-close on test teardown
function connectWs(): Promise<WebSocket>
// Wait for a specific event type from WS (with timeout)
function waitForWsEvent(ws: WebSocket, eventType: string, timeout?: number): Promise<Record<string, unknown>>
// Wait for agent run to complete via polling
async function waitForRunComplete(visitId: string, timeout?: number): Promise<string>
```

## Test Scenarios

### 1. `agent-pipeline.test.ts` — Full pipeline

```
Given: Docker stack is running
When:  I create a visit
 And:  I connect to WebSocket
 And:  I trigger an agent run
Then:  I receive WS events in order: phase (ingest → extract → plan → act)
 And:  Tasks are created (at least the analysis task)
 And:  An analysis artifact is created
 And:  The run completes (status: completed or waiting_on_human)
```

### 2. `hitl-flow.test.ts` — HITL approve

```
Given: A run with a pending_human task
 When: I approve the task with feedback
 Then: A new ready_to_run task is created
 And:  An artifact confirms the approval
```

### 3. `create-visit.test.ts` — Visit CRUD

```
When:  I create a visit via POST
Then:  Response includes id, account_name, subject, created_at
 When:  I fetch the visit via GET
Then:  Response matches the created data
```

## Data Isolation

- Each test creates its own visit with a timestamp-based name (e.g., `e2e-test-<timestamp>`)
- No shared state between tests
- Vitest runs tests sequentially (no concurrency) for the E2E suite
- Tests run with `--testTimeoutPattern` to avoid long waits for Claude

## Test Configuration

```bash
# Run E2E tests against running Docker stack
docker compose up -d           # Start stack
npm run test:e2e:headless      # vitest run --config vitest.e2e.config.ts

# In CI, Docker Compose starts in the CI pipeline
```

`vitest.e2e.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 60000,  // Agent runs can take 30s+
    sequence: { concurrent: false },
  },
})
```

## Files

| File | Purpose |
|------|---------|
| `tests/e2e/helpers.ts` | API + WS test utilities |
| `tests/e2e/setup.ts` | Global setup (verify Docker) |
| `tests/e2e/create-visit.test.ts` | Visit CRUD test |
| `tests/e2e/agent-pipeline.test.ts` | Full pipeline test |
| `tests/e2e/hitl-flow.test.ts` | HITL approve/reject flow |
| `vitest.e2e.config.ts` | E2E-specific Vitest config |
| `package.json` scripts | `test:e2e:headless` script |

## Error Handling

- Tests fail fast with descriptive messages
- WebSocket timeout after 30s if expected event doesn't arrive
- All test data cleaned up (DELETE visits after test)
- Setup file verifies Docker stack health before running tests
