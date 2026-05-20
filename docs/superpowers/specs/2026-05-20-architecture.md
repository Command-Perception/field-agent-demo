# Field Agent System Architecture

> **Date:** 2026-05-20  
> **Project:** field-agent-demo

## System Overview

Field Agent is a sales follow-up automation system. Sales reps submit visit notes, and an AI agent (Claude via CrofAI) extracts action items, drafts emails, researches questions, checks expenses, and generates proposals — all with human-in-the-loop approval gates.

## Architecture Diagram

```
Browser (:4001) ──HTTP──→ Hono API Server (:3999) ──SQL──→ PostgreSQL
                 ──WS────→ WebSocket (:3999/ws)            │
                        │                                  │
                   Agent Engine                         Visits
                   (Claude SDK)                        Agent Runs
                        │                              Agent Tasks
                   CrofAI API                        Artifacts
                   (anthropic.nahcrof.com)
```

## Service Topology

| Service | Port | Purpose | Tech |
|---------|------|---------|------|
| `api` | 3999 | REST API + WebSocket | Hono, @hono/node-server, ws |
| `app` | 4001 | Frontend UI | Next.js 15, React 19, Tailwind |
| `db` | 5432 | Data persistence | PostgreSQL 16 |

## Frontend Architecture

```
src/lib/
  client.ts              # Base HTTP client (typed fetch)
  ws.ts                  # WebSocket singleton (auto-reconnect)
  services/
    visits.ts            # Visit CRUD service
    agent.ts             # Agent run/resolve service

src/hooks/
  useWebSocket.ts        # React hook wrapping wsService

src/components/
  PipelineStepper.tsx    # 5-phase pipeline visualization
  ArtifactViewer.tsx     # Type-specific artifact previews
  TaskList.tsx           # Task list with HITL buttons
  HITLModal.tsx          # Approve/reject modal with feedback
  AgentRunPanel.tsx      # Combined panel: stepper + tasks + artifacts
  DashboardStats.tsx     # Aggregate stat cards
  VisitCard.tsx          # Visit card for dashboard grid
```

**Data flow:** All components import typed service functions. No raw `fetch` calls in any component. The ws.ts singleton manages a single WebSocket connection with automatic reconnection. Components subscribe to specific event types via the useWebSocket hook.

## Backend Architecture

```
src/server/
  index.ts               # Server entry (serve, migrate, graceful shutdown)
  hono.ts                # Hono routes (visits CRUD, agent run/resolve, seed)
  wsManager.ts           # WebSocket server (connections, heartbeat, broadcast)

src/agent/
  client.ts              # Anthropic SDK wrapper (CrofAI endpoint)
  core.ts                # runAgent, executeAgentTasks, resolveHITL
  tools.ts               # 5 Claude-format tool definitions
  toolHandlers.ts        # Tool implementations
  types.ts               # TypeScript types

src/data/
  db.ts                  # PostgreSQL pool singleton
  queries.ts             # All CRUD queries
  migrate.ts             # Schema migrations
  seed.ts                # Mock data
```

## Pipeline Phases

```
Visit ──→ [Ingest] ──→ [Extract] ──→ [Plan] ──→ [Act] ──→ [Done]
            │              │            │          │
         Load visit    Send to      Classify    Execute tasks
         from DB       Claude       items       with tools
                        (no tools)   (3 types)   (5 tools)

Classification: agent → ready_to_run (autonomous)
                human → pending_human (HITL)
                approval → pending_human (HITL)
```

## WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `phase` | `{ runId, phase, status, visitId }` | Phase transition |
| `task` | `{ runId, task }` | Task created |
| `task_done` | `{ runId, taskId, error? }` | Task completed |
| `artifact` | `{ runId, artifact }` | Artifact created |
| `status` | `{ runId, status }` | Run status change |
| `run_complete` | `{ runId, visitId, error? }` | Run finished |

## Database Schema

```
visits ──1:N──→ agent_runs ──1:N──→ agent_tasks
                                  ──1:N──→ artifacts
```

See `src/data/migrate.ts` for exact DDL.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/visits` | List visits (with latest run status) |
| POST | `/api/visits` | Create a new visit |
| GET | `/api/visits/:id` | Visit detail with runs, tasks, artifacts |
| POST | `/api/agent/run` | Trigger agent pipeline |
| GET | `/api/agent/status?visitId=X` | Get latest run status |
| POST | `/api/agent/resolve` | Resolve HITL task |
| POST | `/api/seed` | Seed mock data |

## Task State Machine

```
                    ┌─ approval ──→ pending_human ──approve──→ ready_to_run ──→ done
Visit ──→ agent_run ── human  ──→ pending_human ──reject──→ done
                    └─ agent   ──→ ready_to_run ──────────────→ done
```

## Testing Strategy

| Layer | Tool | Scope | Command |
|-------|------|-------|---------|
| Unit | Vitest | Queries, tools, state transitions | `npm test` |
| Server typecheck | tsc | Agent engine, server code | `npm run typecheck:server` |
| E2E headless | Vitest | Full pipeline via API + WebSocket | `npm run test:e2e:headless` |
| E2E browser | Playwright | UI interactions | `npm run test:e2e` |

## Docker Setup

```yaml
api:   # Hono server, port 3999
  depends_on: db (healthy)
  env: DATABASE_URL, CROFAI_API_KEY

app:   # Next.js frontend, port 4001
  depends_on: api (started)

db:    # PostgreSQL 16, port 5432
  healthcheck: pg_isready
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Hono over Next.js API routes** | Better WebSocket support, cleaner separation |
| **WebSocket over polling** | Real-time pipeline visibility, lower latency |
| **Two-phase LLM** | Extract (no tools) + Act (tools) — focused prompts |
| **Service layer** | Components never call fetch; typed services |
| **HITL as DB state machine** | Tasks persist state transitions; no in-memory state |
| **JSON via `<result>` tags** | Reliable parsing from Claude responses |
