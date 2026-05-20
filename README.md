# Field Agent — SDK for autonomous sales follow-up

A production-grade **Claude SDK agent system** for post-visit sales follow-up automation — written in TypeScript (Next.js 15, PostgreSQL, Docker).

## Quick start

```bash
cp .env.example .env   # Add your CROFAI_API_KEY
docker compose up -d   # Starts app (port 3999) + PostgreSQL
docker compose exec app npx tsx src/data/seed.ts   # Load mock data
open http://localhost:3999
```

## Architecture

### System overview

```mermaid
C4Context
  Person(user, "Sales Rep", "Uses the dashboard to review & approve agent output")
  System_Boundary(agent_system, "Field Agent System") {
    System(ui, "Next.js UI", "Dashboard + visit detail + HITL modal")
    System(api, "Next.js API", "REST endpoints for agent orchestration")
    System(agent, "Agent Engine", "Claude SDK multi-turn tool calling loop")
    SystemDb(db, "PostgreSQL", "visits, runs, tasks, artifacts")
  }
  System_Ext(claude, "Claude API (CrofAI)", "glm-5.1 via Anthropic-compatible endpoint")
  Rel(user, ui, "Views dashboard, approves/rejects")
  Rel(ui, api, "Fetch visits, trigger runs, resolve HITL")
  Rel(api, agent, "runAgent, resolveHITL, executeAgentTasks")
  Rel(agent, claude, "sendMessage with/without tools")
  Rel(agent, db, "Persist runs, tasks, artifacts")
```

### Data flow (pipeline)

```mermaid
flowchart TD
  A[Visit created] --> B[Ingest: send visit context to Claude]
  B --> C[Extract: Claude returns JSON of extracted items]
  C --> D[Plan: items classified as agent / human / approval]
  D --> E{Classification?}

  E -- agent --> F[Categorize as ready_to_run]
  E -- human --> G[Categorize as pending_human - await HITL]
  E -- approval --> G

  F --> H[executeAgentTasks: multi-turn tool loop]
  H --> I[Claude picks tool(s) to call]
  I --> J[Execute tool handler]
  J --> K[Save artifact]
  K --> L{More ready_to_run?}
  L -- yes --> H
  L -- no --> M[Update run status]

  G --> N[UI shows Pending badge + Approve/Reject buttons]
  N --> O{User decision}
  O -- Approve --> P[Create ready_to_run agent task]
  O -- Reject --> Q[Mark done + add rejection artifact]
  P --> H

  M --> R[Run completed or waiting_on_human]
  Q --> R
```

### Agent execution loop (act phase)

```mermaid
sequenceDiagram
  participant API as API Route
  participant Agent as Agent Engine
  participant Claude as Claude SDK
  participant Tools as Tool Handlers
  participant DB as PostgreSQL

  API->>Agent: runAgent(visitId)
  Agent->>DB: createRun, addTask (analysis)
  Agent->>Claude: sendMessage(extract prompt, no tools)
  Claude-->>Agent: JSON with extracted items
  Agent->>DB: addTask per item (agent→ready_to_run, human→pending_human)
  Agent->>DB: addArtifact (analysis)
  Agent->>Agent: executeAgentTasks(runId)

  loop For each ready_to_run task
    Agent->>DB: getReadyAgentTasks
    Agent->>Claude: sendMessage(task prompt, with tools)
    Claude-->>Agent: tool_use blocks (0 or more)
    loop For each tool_use
      Agent->>Tools: dispatch to handler
      Tools->>DB: addArtifact (email_draft/research/proposal/etc)
      Tools-->>Agent: ToolHandlerResult
    end
    Agent->>DB: updateTaskState (done)
  end

  Agent->>DB: updateRunStatus (completed | waiting_on_human)
  Agent-->>API: getVisitWithRuns
```

## Project structure

```
agent-system/
├── src/
│   ├── agent/
│   │   ├── client.ts          # Anthropic SDK wrapper → CrofAI endpoint
│   │   ├── core.ts            # runAgent, executeAgentTasks, resolveHITL
│   │   ├── tools.ts           # 5 Claude-format tool definitions
│   │   ├── toolHandlers.ts    # Tool implementations (email, research, etc.)
│   │   └── types.ts           # TypeScript types for the domain
│   ├── app/
│   │   ├── page.tsx           # Dashboard: lists visits with latest run status
│   │   ├── visits/[id]/page.tsx  # Visit detail: context card + agent run panel
│   │   └── api/
│   │       ├── visits/        # GET /api/visits, GET /api/visits/[id]
│   │       └── agent/
│   │           ├── run/route.ts    # POST /api/agent/run
│   │           ├── status/route.ts # GET /api/agent/status
│   │           └── resolve/route.ts # POST /api/agent/resolve
│   ├── components/
│   │   ├── AgentRunPanel.tsx   # Status badge + task list + artifacts
│   │   ├── TaskList.tsx        # Task items with approve/reject buttons
│   │   └── HITLModal.tsx       # Approve/reject modal with feedback
│   └── data/
│       ├── db.ts              # PostgreSQL pool singleton
│       ├── migrate.ts         # Schema: visits, agent_runs, agent_tasks, artifacts
│       ├── seed.ts            # 5 mock visits across industries
│       ├── queries.ts         # All CRUD queries
│       └── init.ts            # Initialize DB connection
├── tests/
│   ├── unit/
│   │   ├── state.test.ts      # Task classification state transitions
│   │   ├── tools.test.ts      # Tool definition format validation
│   │   └── queries.test.ts    # DB query shape verification
│   └── integration/
│       └── api.test.ts        # API endpoint integration tests
├── Dockerfile                 # Multi-stage Next.js standalone build
├── docker-compose.yml         # App + PostgreSQL services
└── package.json               # Dependencies: Next.js, pg, @anthropic-ai/sdk
```

## Pipeline phases (Ingest → Extract → Plan → Act → Handoff)

### Phase 1: Ingest (`core.ts:44-58`)
Visit context (account, notes, outcomes) is loaded from PostgreSQL and sent to Claude in a single-shot extraction prompt.

### Phase 2: Extract (`core.ts:60-71`)
Claude returns structured JSON inside `<result>` tags with extracted items classified as `agent`, `human`, or `approval`. The raw analysis is saved as an artifact.

### Phase 3: Plan (`core.ts:74-95`)
Each extracted item becomes a task:
- **agent** → `ready_to_run` (autonomous execution)
- **human** → `pending_human` (awaits sales rep input)
- **approval** → `pending_human` (awaits human review)

### Phase 4: Act (`core.ts:118-164`, `toolHandlers.ts`)
`executeAgentTasks()` runs a multi-turn loop for all `ready_to_run` tasks:
1. Fetch pending agent tasks from DB
2. For each task, call Claude **with tools enabled**
3. Claude chooses which tool(s) to call (0 or more per task)
4. Tool handlers execute and save artifacts
5. Tasks marked `done` with results

Available tools:

| Tool | Description | Handler behavior |
|------|-------------|-----------------|
| `draft_email` | Draft a customer email | Polishes via Claude (or falls back), saves as email_draft artifact |
| `research_question` | Research an open question | Generates findings via Claude (or template), saves as research artifact |
| `create_followup_task` | Create a sub-task | Inserts DB record, creates note artifact |
| `check_expense` | Check expense policy | Compares against policy rules (daily limits, categories) |
| `generate_proposal_outline` | Generate a proposal | Generates via Claude (or template), saves as proposal artifact |

### Phase 5: Handoff (`core.ts:168-210`, `HITLModal.tsx`)
- Human-classified and approval-classified tasks wait in `pending_human` state
- UI shows Approve/Reject buttons; clicking opens the HITL modal
- **Approve**: Creates a `ready_to_run` agent task → immediately executed via `executeAgentTasks()`
- **Reject**: Task marked `done` with feedback; rejection note saved as artifact
- Run marked `completed` when no pending tasks remain

## Database schema

```mermaid
erDiagram
  visits ||--o{ agent_runs : "has many"
  agent_runs ||--o{ agent_tasks : "has many"
  agent_runs ||--o{ artifacts : "has many"

  visits {
    uuid id PK
    text account_name
    text account_industry
    text subject
    text notes
    text outcomes
    text owner_alias
    timestamptz created_at
  }

  agent_runs {
    uuid id PK
    uuid visit_id FK
    text status "running|waiting_on_human|completed|failed"
    text summary
    timestamptz created_at
    timestamptz updated_at
  }

  agent_tasks {
    uuid id PK
    uuid run_id FK
    text type "agent|human|approval"
    text title
    text description
    text state "pending_human|ready_to_run|blocked|done"
    jsonb details
    jsonb result
    timestamptz created_at
    timestamptz updated_at
  }

  artifacts {
    uuid id PK
    uuid run_id FK
    text type "analysis|email_draft|research|proposal|expense_check|note"
    text title
    text content
    int version
    timestamptz created_at
  }
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/visits` | List all visits with latest run status |
| GET | `/api/visits/:id` | Get visit detail with runs, tasks, artifacts |
| POST | `/api/agent/run` | Trigger agent run (body: `{ visitId }`) |
| GET | `/api/agent/status?visitId=X` | Get latest run status |
| POST | `/api/agent/resolve` | Resolve HITL task (body: `{ runId, taskId, approved, feedback? }`) |

## Claude SDK integration

Uses the **Anthropic TypeScript SDK** pointed at CrofAI's Anthropic-compatible endpoint:

```typescript
// src/agent/client.ts
const anthropic = new Anthropic({
  apiKey: process.env.CROFAI_API_KEY,
  baseURL: "https://anthropic.nahcrof.com",
})
```

**Two calling modes:**
1. **Extraction** (no tools) — `sendMessage` with system prompt + visit context, parses JSON from `<result>` tags
2. **Execution** (with tools) — `sendMessage` with `tools` array, handles `tool_use` response blocks, dispatches to handler map

## Task states

```mermaid
stateDiagram-v2
  [*] --> ready_to_run: agent classification
  [*] --> pending_human: human / approval classification

  ready_to_run --> done: executeAgentTasks succeeds
  ready_to_run --> done: executeAgentTasks fails (w/ error)

  pending_human --> ready_to_run: approved (creates agent sub-task)
  pending_human --> done: rejected

  done --> [*]
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CROFAI_API_KEY` | Yes | — | Anthropic-compatible API key for Claude |
| `ANTHROPIC_API_KEY` | No (fallback) | — | Fallback if CROFAI_API_KEY not set |
| `ANTHROPIC_BASE_URL` | No | `https://anthropic.nahcrof.com` | API base URL |
| `ANTHROPIC_MODEL` | No | `glm-5.1` | Model name |
| `DATABASE_URL` | No | `postgres://agent:agent@localhost:5432/agent` | PostgreSQL connection |
| `PORT` | No | `3999` | App port |

## Testing

```bash
npm test              # 12 unit + integration tests (vitest)
npm run test:e2e      # Playwright E2E (requires compose up)
npm run typecheck     # tsc --noEmit
```

## Developing locally

```bash
# Start dependencies
docker compose up -d postgres

# Start dev server with hot reload
npm run dev       # → http://localhost:3999

# Run migrations + seed
npm run db:migrate
npm run db:seed
```

## Design decisions

| Decision | Rationale |
|----------|-----------|
| **Claude SDK, not Vercel AI SDK** | Direct control over tool calls, streaming, and message formatting |
| **PostgreSQL, not SQLite/Convex** | Production-grade; existing fieldr project has no backend DB |
| **Standalone subproject** | Zero coupling to the existing fieldr app; no imports or dependencies |
| **JSON extraction via `<result>` tags** | Reliable parsing; Claude wraps JSON in XML tags consistently |
| **Multi-turn tool calling** | Agent decides which tool(s) to call per task, not hard-coded dispatch |
| **Two-phase (extract → execute)** | Separate concerns: extraction needs no tools, execution needs full tool set |
| **HITL as DB state machine** | Tasks persist state transitions; UI polls via API; no websocket complexity |

## Bridge docs: Moving from fieldr submodule to standalone

This project lives at `agent-system/` inside the fieldr monorepo. To extract it:

```bash
# From fieldr root
cd agent-system
git init
git add .
git commit -m "feat: initial standalone agent system"

# Create repo on GitHub, then:
git remote add origin git@github.com:command-perception/field-agent.git
git push -u origin main
```

Back in fieldr root, replace the directory with a submodule:

```bash
cd ..
rm -rf agent-system
git submodule add git@github.com:command-perception/field-agent.git agent-system
git commit -m "refactor: replace agent-system with submodule"
```
