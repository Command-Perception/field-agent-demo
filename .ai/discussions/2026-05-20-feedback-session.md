# Feedback Session — 2026-05-20

## Source
`.ai/feedback/Feedback.md` — reworking the agentic process flows and UI.

## Key Decisions

### Overall Direction
- Move from visit-centric ingest→extract→save pipeline to **flow-centric agentic workflows** with branching, decisions, and HITL gates
- Theme: **Dental sales** for sample scenarios
- Flows stored in `.ai/samples/` as TypeScript class files
- Flow execution engine wraps real Claude SDK agent calls with automatic event recording
- Primary demo mode: record once, replay with keyboard navigation

### Overrides from Original Feedback
- **No Qwen 3.5 27B routing** — The main Claude SDK agent (DeepSeek V4 Flash) handles everything directly. The flow definitions determine routing structure, the AI executes within them.
- **No "Run Agent" button** — Agent auto-runs when inbox email is clicked or test flow is launched from menu.
- **Debug panel moved to floating overlay** — Not a permanent right panel. Right panel is the Step View instead.

### Three Sample Flows (Dental Sales Theme)

Each flow is a TypeScript class extending `FlowDefinition`, defined in `.ai/samples/`.

**1. 🍽️ Friendly Sales Visit (Lunch Expense)**
- Agent takes dentist to lunch, submits expense
- Decision tree: receipt check → per diem check ($100) → client type → time-of-day
- Under $100 → auto-approved, Over $100 → HITL approval

**2. 🔧 Scheduled Maintenance Visit**
- Scheduled trigger → AI matches visit to maintenance schedule
- Decision tree: warranty check → parts availability → service execution → scheduling preference
- Includes success/error paths, escalation for major issues

**3. ⚠️ Recall Flow**
- Recall initiated → assess severity → order parts → schedule → precondition wait → execute
- Decision tree: severity → scope → parts availability → precondition → execute → notify
- Precondition: parts_arrived with retry/backoff and escalation

### Flow Engine & Recording
- `FlowEngine.run(flow, input)` wraps execution in FlowContext
- FlowContext provides: `ctx.tools.*` (auto-recording), `ctx.decide()`, `ctx.waitFor()`, `ctx.requestApproval()`
- Every event type is recorded: step_start/end, tool_call/result, decision/branch_taken, precondition checks, HITL states, completion/failure
- Execution trace stored as JSONB column on `agent_runs`

### Replay System
- `useExecutionReplay` hook with `react-hotkeys-hook` for arrow key navigation
- Cursor-based: events before = green, at = blue, after = gray
- Forward/back buttons + arrow key shortcuts
- Configurable speed: fast (100ms), normal (500ms), slow (1000ms)

### UI Architecture
- **Three-panel design**:
  - **Left panel**: Email inbox (click to auto-trigger flow) + Test flows menu
  - **Center panel**: React Flow chart with 6 custom node types (trigger, step, decision, hitl, precondition, parallel)
  - **Right panel**: Step View — sequential event list with status badges
- **Debug console**: Floating Sheet/Dialog overlay, toggled from nav bar
- **Top nav bar**: Navigation links + UserSwitcher (3 roles) + Debug toggle

### ShadCN Migration
- Add `@radix-ui` packages for ShadCN components
- Migrate: VisitCard, DashboardStats, TaskList, HITLModal → ShadCN equivalents
- Remove: PipelineStepper, AgentRunPanel, Run Agent button
- Components to build: FlowChart, FlowNode, StepView, InboxPanel, TestFlowsMenu, PlaybackControls, DebugOverlay, UserSwitcher

### Demo Workflow
- Before meetup: Run flows for real, verify traces, pre-load in app
- At meetup: Click email → load recorded trace → arrow key through steps
- Fallback: Live run via WebSocket streaming

### Mock Data
- MockEmail table/seed data: from, subject, body, flow_hint, read status
- Three mock user roles: John Doe (Sales), Jane Smith (Maintenance), Admin
- Existing visit seed data can map into flow inputs

### Pages
- `/` → Flow Execution View (replaces old dashboard)
- `/visits/[id]` → Removed (visit context folds into flow input)
- `/new` → Removed (no manual visit creation)
- API: remove `POST /api/agent/run`, add `POST /api/flow/run`, `GET /api/flows/traces`

## Mockups Created (`.ai/mockups/`)
- `01-dashboard-overview.html` — Full app layout with inbox, execution, step view, debug overlay (Tailwind)
- `02-dental-scenarios.html` — Three scenario flowcharts
- `03-reactflow-execution-view.html` — Detailed React Flow-style view with node states and debug panel
- `04-waiting.html` — Transition screen

### Additional Decisions (Third-Pass Audit)

- **Tool catalog**: New domain tools per flow (assessRecallSeverity, checkWarranty, orderParts, etc.) alongside shared tools
- **Flow registration**: `Map<string, FlowDefinition>` registry in `src/agent/flowRegistry.ts`
- **`.ai/samples/` imports**: Add tsconfig alias `@samples/*` → `./.ai/samples/*`
- **Step detail interaction**: Clicking a step in Step View expands to show tool input/output, syncs with React Flow node
- **Seed data**: New dental-themed mock emails with `flow_hint` fields. Existing visit seeds replaced.
- **Routing**: Direct `flow_hint` → registry mapping. No AI routing. Override of original Qwen proposal.
- **HITL suspension**: Event-driven promise approach — flow suspends, resumes when API resolves it
- **Existing tables**: `agent_tasks` and `artifacts` persist, `visits` table removed
- **ShadCN setup**: Need `npx shadcn@latest init` + individual component adds

## Design Doc
`docs/superpowers/specs/2026-05-20-agentic-flows-and-dashboard-redesign.md`
