# Agentic Flows & Dashboard Redesign

**Date:** 2026-05-20
**Status:** Draft
**Source:** `.ai/feedback/Feedback.md`

## Overview

Redesign the field-agent demo from a linear visit-centric pipeline (ingest→extract→save) to a flow-centric agentic system with branching, decisions, human-in-the-loop gates, and preconditions. The demo targets meetup presentations — real AI execution pre-recorded, with keyboard-navigated playback during the talk.

---

## 1. Sample Flows

Each flow is a TypeScript class extending a base `FlowDefinition`, stored in `.ai/samples/`. Three initial flows with a dental sales theme:

### 1.1 Sales Visit (Lunch Expense)

**Trigger:** Mock email notification of client lunch expense

**Decision Tree:**
```
Expense submitted
  ├─ Receipt attached?
  │    ├─ Yes → proceed
  │    └─ No  → request receipt from agent
  │
  ├─ Per diem check ($100 limit)
  │    ├─ Under → auto-approved ✅
  │    └─ Over → HITL approval needed
  │
  ├─ Client type check
  │    ├─ Existing client → standard approval
  │    └─ New prospect → modified rules
  │
  └─ Time-of-day check
       ├─ Business hours → normal
       └─ Unusual time → flag for review
```

### 1.2 Scheduled Maintenance Visit

**Trigger:** Scheduled timer / calendar event

**Decision Tree:**
```
Maintenance triggered
  ├─ Warranty check
  │    ├─ In warranty → OEM parts, no cost
  │    └─ Out of warranty → generate quote
  │
  ├─ Parts availability
  │    ├─ In stock → schedule immediately
  │    └─ Backordered → precondition + notify delay
  │
  ├─ Service execution
  │    ├─ Success → log + send thank-you
  │    └─ Issue found → create follow-up ticket / escalate
  │
  └─ Scheduling preference
       ├─ Customer AM/PM preference → slot accordingly
       └─ No preference → auto-slot
```

### 1.3 Recall Flow

**Trigger:** Mock recall notice email

**Decision Tree:**
```
Recall received
  ├─ Severity assessment
  │    ├─ Critical → immediate action, notify all customers today
  │    └─ Standard → schedule within 30-day window
  │
  ├─ Recall scope
  │    ├─ Single unit → one visit
  │    └─ Fleet-wide → batch scheduling, bulk parts
  │
  ├─ Order parts
  │    ├─ In stock → ship immediately
  │    ├─ Backordered → get ETA
  │    └─ Discontinued → source alternative (human decision)
  │
  ├─ Precondition: parts_arrived
  │    ├─ Yes → proceed to service
  │    └─ No → retry with backoff, escalate if persistent
  │
  ├─ Execute recall
  │    ├─ Success → verify fix, close
  │    └─ Failed → document, escalate
  │
  └─ Customer notification
       ├─ Draft email → require approval
       └─ Already notified → skip
```

### 1.4 Flow Definition Format

```typescript
// .ai/samples/recall-flow.ts
import { FlowDefinition, FlowContext } from "@/agent/flow"

export class RecallFlow extends FlowDefinition {
  name = "Recall Flow"
  description = "Handle equipment recall: assess, order parts, schedule, execute"

  async execute(ctx: FlowContext) {
    const severity = await ctx.tools.assessRecallSeverity({ text: ctx.input.email.content })

    if (severity === "critical") {
      await ctx.tools.notifyUrgent(ctx.input.customer)
    }

    const parts = await ctx.tools.orderParts({ part: "X100-bracket", qty: 5 })
    const visit = await ctx.tools.scheduleVisit({ reason: "recall" })

    await ctx.waitFor("parts_arrived", {
      check: () => inventory.check(parts.orderId),
      retry: { max: 3, backoff: "1h", onTimeout: "escalate" },
    })

    await ctx.tools.executeRecall(visit.id)
  }
}
```

---

## 2. Flow Engine & Recording

### 2.1 Architecture

```
FlowEngine.run(flow, input)
  │
  ├── Creates FlowContext with:
  │     ├── ToolRegistry (real Claude SDK tool calls)
  │     ├── EventRecorder (captures every step/decision/tool-call)
  │     └── DecisionHandlers (branch points)
  │
  ├── Calls flow.execute(ctx) — real AI execution
  │
  └── Returns ExecutionTrace { flowName, events[] }
        └── Saved to execution_events table for replay
```

### 2.2 Event Types

| Event | Trigger | Data |
|-------|---------|------|
| `step_start` | Method call on flow class | `{ label, description }` |
| `step_end` | Method completes | `{ label, result }` |
| `tool_call` | `ctx.tools.*()` invoked | `{ tool, input }` |
| `tool_result` | Tool handler returns | `{ tool, output }` |
| `decision` | `ctx.decide()` called | `{ label, options }` |
| `branch_taken` | Decision resolves | `{ label, chosen, reason }` |
| `precondition_check` | `waitFor` retry | `{ condition, attempt, result }` |
| `precondition_met` | Condition passes | `{ condition, attempts }` |
| `hitl_waiting` | Approval requested | `{ label, context }` |
| `hitl_resolved` | User approves/rejects | `{ label, approved, feedback }` |
| `completed` | Flow finishes | `{ summary }` |
| `failed` | Flow errors | `{ error }` |

### 2.3 FlowContext API

```typescript
class FlowContext {
  input: FlowInput
  tools: ToolRegistry         // real Claude SDK tool calls
  state: Map<string, any>     // shared state across steps

  // Recording
  async tools: Proxy          // auto-records every tool call

  // Decisions — records options and chosen branch
  async decide<T>(label: string, opts: { prompt: string; choices: T[] }): Promise<T>

  // Preconditions — retry with backoff
  async waitFor(label: string, opts: {
    check: () => Promise<boolean>
    retry: { max: number; backoff: string; onTimeout: "escalate" | "fail" }
  }): Promise<void>

  // HITL gates
  async requestApproval(label: string, context: Record<string, unknown>): Promise<{approved: boolean; feedback?: string}>
}
```

### 2.4 Data Model

New table for execution events:

```sql
CREATE TABLE execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  flow_name TEXT NOT NULL,
  sequence INT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_execution_events_run ON execution_events(run_id, sequence);
```

For a demo app, store events as a JSONB column on `agent_runs` — avoids joins, simpler to read/write, one query gets everything:

```sql
ALTER TABLE agent_runs ADD COLUMN execution_trace JSONB;
```

Structure of `execution_trace`:
```json
{
  "flow_name": "RecallFlow",
  "events": [
    { "sequence": 0, "type": "step_start", "label": "Assess severity", "data": {...} },
    { "sequence": 1, "type": "decision", "label": "Severity check", "data": {...} },
    ...
  ]
}
```

---

## 3. Replay System

### 3.1 Hook

```typescript
// src/hooks/useExecutionReplay.ts
import { useHotkeys } from "react-hotkeys-hook"  // or similar lib

type ExecutionEvent = { sequence: number; type: string; label: string; data?: any }

function useExecutionReplay(events: ExecutionEvent[]) {
  const [cursor, setCursor] = useState(0)

  const next = () => setCursor(c => Math.min(c + 1, events.length - 1))
  const prev = () => setCursor(c => Math.max(c - 1, 0))

  useHotkeys("arrowright", next, [events.length])
  useHotkeys("arrowleft", prev, [])

  // Return subset of events up to cursor for rendering
  const visibleEvents = events.slice(0, cursor + 1)
  const currentEvent = events[cursor]

  return { cursor, currentEvent, visibleEvents, next, prev, isAtStart: cursor === 0, isAtEnd: cursor === events.length - 1 }
}
```

### 3.2 Replay States

- **Cursor before event**: node rendered gray (pending)
- **Cursor at event**: node rendered blue with highlight (active)
- **Cursor past event**: node rendered green (completed) or red (failed)

---

## 4. UI Architecture

### 4.1 Layout

Three-panel design with floating debug overlay:

```
┌─────────────────────────────────────────────────────────────┐
│ Nav: [Logo] [Dashboard|Flows|History]    [User ▼] [🐛 Toggle] │
├─────────────┬─────────────────────────┬────────────────────┤
│  LEFT       │       CENTER            │      RIGHT          │
│             │                         │                      │
│  📬 Inbox   │   React Flow Canvas      │   📋 Step View      │
│  🧪 Flows   │   (flowchart graph)      │   (event list)      │
│             │                         │                      │
└─────────────┴─────────────────────────┴────────────────────┘
                        │
              🐛 Debug Overlay (floating Sheet/Dialog)
```

### 4.2 Component Tree

```tsx
<FlowExecutionView>
  <TopNav>
    <NavLinks />
    <UserSwitcher />           {/* role-based: Sales / Maintenance / Admin */}
    <DebugToggle />
  </TopNav>

  <ThreePanelLayout>
    <LeftPanel>
      <InboxPanel />           {/* mock email list */}
      <TestFlowsMenu />        {/* launch pre-defined flows */}
    </LeftPanel>

    <CenterPanel>
      <FlowChart               {/* React Flow <ReactFlow> */}
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={customNodeTypes}
      >
        <Controls />
        <MiniMap />
        <FlowLegend />
      </FlowChart>
      
      <PlaybackControls>       {/* prev / next + step counter */}
        <Button onClick={prev}>← Prev</Button>
        <span>Step {cursor} of {total}</span>
        <Button onClick={next}>Next →</Button>
      </PlaybackControls>
    </CenterPanel>

    <RightPanel>
      <StepView>
        <StepItem />           {/* each event with status badge */}
      </StepView>
    </RightPanel>
  </ThreePanelLayout>

  <DebugOverlay>               {/* Sheet/Dialog, toggleable */}
    <ToolCallTrace />          {/* monospace event log */}
  </DebugOverlay>
</FlowExecutionView>
```

### 4.3 Custom React Flow Node Types

| Type | Shape | Colors | Ports |
|------|-------|--------|-------|
| `trigger` | Rounded pill | Slate bg | 1 output |
| `step` | Rectangle | Blue border, white bg | 1 input, 1 output |
| `decision` | Diamond | Amber border, amber-50 bg | 1 input, 2+ outputs |
| `hitl` | Rectangle | Red-400 border, red-50 bg | 1 input, 1 output |
| `precondition` | Rounded rect, dashed | Amber border, dashed | 1 input, 1 output |
| `parallel` | Rectangle | Purple border | 1 input, 2+ outputs (fork) or 2+ inputs, 1 output (join) |

Each node renders its status badge: completed (green), active (blue), pending (gray), failed (red), blocked (amber).

### 4.4 ShadCN Component Usage

| ShadCN Component | Location | Purpose |
|---|---|---|
| `Button` | Nav, PlaybackControls, HITL | Actions |
| `Badge` | StepItem, FlowNode | Status indicators |
| `Card` | InboxPanel, StepView | Containers |
| `Sheet` | DebugOverlay | Floating debug panel |
| `Dialog` | HITLModal | Approval modal |
| `Select` | UserSwitcher | Role selection |
| `Separator` | Panel dividers | Visual separation |
| `ScrollArea` | Inbox, StepView, Debug | Scrollable panels |
| `Tooltip` | FlowNode | Hover info on nodes |

### 4.5 Existing Components to Migrate

- `VisitCard` → ShadCN Card + Badge
- `DashboardStats` → ShadCN Card grid
- `TaskList` → ShadCN ScrollArea + Badge
- `HITLModal` → ShadCN Dialog
- `PipelineStepper` → **Remove** (replaced by FlowChart)
- `AgentRunPanel` → **Replaced** by FlowExecutionView
- `ArtifactViewer` → ShadCN Card with expand

---

## 5. Demo Workflow

### Before Meetup (Record)

1. Define flow files in `.ai/samples/` (TypeScript classes)
2. Click "Run" on each flow from the Test Flows menu
3. Real AI execution runs via Claude SDK (DeepSeek V4 Flash)
4. Full execution trace saved to `execution_events` table
5. Verify results and traces look good for presentation

### At Meetup (Replay)

1. Dashboard loads — pre-recorded flows visible in inbox
2. Click a flow → loads into FlowChart with StepView
3. Use **→ / ← arrow keys** or **Prev/Next buttons** to step through
4. Each step animates: node highlights, edges animate, step view scrolls
5. HITL points show what the AI requested (approval state is recorded)
6. Debug overlay available for deeper inspection if needed

### Fallback: Live Run

If desired, can still do a live run from the Test Flows menu — real AI execution streams into the same UI in real-time.

---

## 6. Implementation Order

1. **Flow engine** — `FlowDefinition` base class, `FlowContext`, `EventRecorder`
2. **Sample flow files** — three flows in `.ai/samples/`
3. **Execution recording** — save traces to DB
4. **Replay hook** — `useExecutionReplay` with keyboard support
5. **React Flow integration** — custom node types, edge animations
6. **Three-panel UI** — inbox, flow chart, step view
7. **ShadCN migration** — migrate existing components, add new ones
8. **Floating debug overlay**
9. **Demo polish** — timing, animations, edge cases

---

## 7. Resolved Decisions

| Question | Decision |
|----------|----------|
| Events storage | JSONB column on `agent_runs` — simpler, no joins, demo-friendly |
| Flow graph layout generation | From the flow definition class at design time — the class structure defines nodes and edges; events only annotate state |
| Keyboard library | `react-hotkeys-hook` — lightweight, well-maintained, no deps |
| ShadCN migration scope | Migrate existing components AND build new Flow Execution view with ShadCN. Full migration ensures visual consistency. |
| Flow routing AI | **Override from original feedback:** Use the main Claude SDK agent (DeepSeek V4 Flash) directly — no separate Qwen 3.5 27B routing step. The flow definitions determine routing, the AI executes within them. |
| "Run Agent" button | **Removed.** Agent auto-runs when an inbox email is clicked or a test flow is launched from the menu. |
| Flow routing mechanism | Direct `flow_hint` → `flowRegistry` key mapping. No AI routing. Mock emails embed the hint at seed time. |
| `.ai/samples/` imports | Add tsconfig path alias `@samples/*` → `./.ai/samples/*` to resolve TypeScript imports. |
| Flow registration | `Map<string, FlowDefinition>` registry in `src/agent/flowRegistry.ts` — explicit import per flow class. |
| HITL suspension model | Event-driven: promise stored in-memory keyed by `runId + label`, resolved by API endpoint. |
| Existing tables | `agent_tasks` and `artifacts` persist alongside new `execution_trace` JSONB. `visits` table removed. |
| Seed data strategy | New mock email seeds with dental theme and `flow_hint` fields. Existing cross-industry visits replaced. |
| Tool strategy | New domain-specific tool definitions per flow, registered in the tool registry alongside existing tools. |

## 8. Additional Design Details

### 8.1 Mock Email Inbox & Auto-Trigger

Mock emails are seeded data (like existing visits). Each email has a `flow_hint` field that maps to a flow class:

```typescript
type MockEmail = {
  id: string
  from: string
  subject: string
  body: string
  flow_hint: "sales_visit" | "maintenance" | "recall"   // which flow to trigger
  read: boolean
  created_at: string
}
```

**Behavior:**
- Emails populate the inbox panel on page load
- Clicking an email auto-launches its mapped flow (no "Run" button)
- During replay, clicking a different email swaps the execution trace
- Test Flows menu provides the same launch capability manually

### 8.2 User Roles

Three mock user roles accessible via the UserSwitcher dropdown:

| Role | Description | Uses |
|------|-------------|------|
| **John Doe (Sales)** | Sales agent — initiates visits, submits expenses | Sales Visit flow |
| **Jane Smith (Maintenance)** | Service tech — executes maintenance & recalls | Maintenance, Recall flows |
| **Admin** | Manager — approves HITL requests | Approval gate across all flows |

### 8.3 Artificial Pacing

During replay, steps advance with a configurable delay between events:

```typescript
type ReplayConfig = {
  speed: "fast" | "normal" | "slow"
  delayMs: number    // override
}
```

- **Fast** (100ms) — for rehearsing
- **Normal** (500ms) — for meetup demos
- **Slow** (1000ms) — for explaining step by step

The speed toggle lives in the PlaybackControls bar. Arrow key navigation bypasses the delay entirely (instant skip).

### 8.4 Navigation Between Recorded Flows

The inbox panel acts as a flow selector:
- Each email represents a recorded execution trace
- Clicking a new email swaps the FlowChart to that trace
- The Step View and all state update accordingly
- No page navigation — everything is in the same view

### 8.5 Live Run Fallback (WebSocket)

The existing WebSocket infrastructure (`wsManager.ts`, `useWebSocket.ts`) supports live streaming. For a live run at meetup:
1. Click "Run Live" from test flows menu
2. Real AI execution runs server-side
3. Events stream via WebSocket to the FlowChart
4. React Flow nodes update in real-time
5. Same UI, different data source: replay (from JSONB) vs live (from WS)

### 8.6 Existing Page Migration

The current visit-centric pages undergo these changes:

| Page | Fate |
|------|------|
| `/` (Dashboard) | **Replaced** — becomes the Flow Execution View with inbox + flow chart |
| `/visits/[id]` | **Removed** — visit context folds into the flow input data |
| `/new` | **Removed** — no manual visit creation; flows triggered via inbox |
| API endpoints | Updated: remove `POST /api/agent/run`, add `POST /api/flow/run` and `GET /api/flows/traces` |

### 8.7 Tool Catalog for New Flows

The existing 5 tools (draft_email, research_question, create_followup_task, check_expense, generate_proposal_outline) were designed for sales follow-up. The dental sales flows need different domain tools.

**Shared tools** (used across flows):
- `send_notification` — Send an in-app or email notification to a user role
- `create_service_record` — Log a completed service event
- `get_customer_info` — Look up customer details by name/ID

**Sales Visit flow tools:**
- `submit_expense_report` — Submit an expense for processing
- `check_per_diem` — Check if amount is within per-diem policy
- `verify_receipt` — Check if receipt is attached and valid
- `flag_for_review` — Flag expense for manual review (unusual time/category)

**Maintenance flow tools:**
- `check_warranty_status` — Check if equipment is under warranty
- `check_part_inventory` — Check if parts are in stock
- `quote_customer` — Generate and send a quote for out-of-warranty work
- `schedule_visit` — Schedule a maintenance visit with customer preference

**Recall flow tools:**
- `assess_recall_severity` — Assess severity of recall notice
- `order_parts` — Order replacement parts for recall
- `notify_customer` — Send recall notification to affected customer
- `execute_recall` — Mark recall as executed/verified

Each tool is defined as an Anthropic SDK `Tool` object (matching the pattern in `src/agent/tools.ts`) and registered in the tool registry that `FlowContext.tools` proxies to.

### 8.8 Flow Registration & Discovery

The engine needs to know what flows exist. A simple registry pattern:

```typescript
// src/agent/flowRegistry.ts
import { RecallFlow } from "../../.ai/samples/recall-flow"
import { SalesVisitFlow } from "../../.ai/samples/sales-visit-flow"
import { MaintenanceFlow } from "../../.ai/samples/maintenance-flow"

export const flowRegistry = new Map<string, FlowDefinition>([
  ["recall", new RecallFlow()],
  ["sales_visit", new SalesVisitFlow()],
  ["maintenance", new MaintenanceFlow()],
])
```

**Import path for `.ai/samples/`**: Since `.ai/` is outside `src/`, either:
- Add a tsconfig path alias: `"@samples/*": ["./.ai/samples/*"]`
- Or use relative imports (works but verbose): `"../../.ai/samples/recall-flow"`

The registry is a simple `Map<string, FlowDefinition>` — flow_key → instance. The `flow_hint` on emails matches the key.

### 8.9 Step Detail Interaction

When the user clicks a step in the Step View (right panel), it expands to show:

```
┌─────────────────────────┐
│ ✓ Order Parts           │  ← clicked, expanded
│  ┌───────────────────┐  │
│  │ Tool: order_parts   │  │
│  │ Input:             │  │
│  │  { part: "X100",   │  │
│  │    qty: 5 }        │  │
│  │ Result:            │  │
│  │  PO#2024-042       │  │
│  │  Status: Placed    │  │
│  └───────────────────┘  │
│ ○ Schedule Visit        │  ← pending
└─────────────────────────┘
```

This also syncs the React Flow nodes — clicking a step in the sidebar highlights the corresponding node in the flowchart and animates the path to it. The cursor jumps to that event's sequence number in the replay.

### 8.10 Seed Data for Dental Flows

The existing seed creates 5 cross-industry visits. New seed data for the dental theme:

```typescript
// .ai/samples/seed-emails.ts  (or within src/data/seed.ts)
const mockEmails = [
  {
    from: "Dr. Smith <smith@acmedental.com>",
    subject: "Lunch Meeting — Thank You",
    body: "Thanks for the great lunch today! Let's move forward with the imaging software proposal.",
    flow_hint: "sales_visit",
  },
  {
    from: "System <noreply@equipment-monitor.local>",
    subject: "Scheduled Maintenance — X100 Imaging Unit",
    body: "Routine 6-month maintenance due for X100 at Acme Dental. Schedule within 14 days.",
    flow_hint: "maintenance",
  },
  {
    from: "Manufacturer Alert <recalls@dental-mfg.local>",
    subject: "URGENT: Recall Notice — X100 Bracket Assembly",
    body: "Safety recall for X100 bracket assembly (lot #B4-2024). Units affected: 3 at Acme Dental.",
    flow_hint: "recall",
  },
]
```

Each email is seeded alongside the matching customer/equipment data needed for the flow's input context.

### 8.11 Flow Routing Mechanism

When an inbox email is clicked:

```
User clicks email
  → Email has flow_hint: "recall"
  → flowRegistry.get("recall")  → RecallFlow instance
  → FlowEngine.run(RecallFlow, { email, customer, ... })
  → Execution begins (or trace loads if pre-recorded)
```

The `flow_hint` field is a direct key into the registry — no AI routing needed. This was the decision to override the original Qwen routing proposal. The email is generated with the hint baked in; the flow class then makes real AI decisions internally via `ctx.decide()`.

### 8.12 Flow Suspension for HITL

`ctx.requestApproval()` must suspend the flow execution and resume when the user responds. This differs from the current task-based HITL model:

```typescript
// Flow side (server)
const result = await ctx.requestApproval("Approve expense of $187.50", {
  from: "John Doe",
  amount: 187.50,
  category: "entertainment",
})
// Execution PAUSES here until user responds
// Result: { approved: true, feedback: "Looks good" }
```

**Implementation approaches:**
1. **Polling**: Flow polls a `hitl_responses` table on a timer. Simple but wasteful.
2. **Event-driven**: Flow awaits a promise that resolves when the UI sends the HITL response via API. The promise is stored in an in-memory map keyed by `runId + stepLabel`, resolved by the `POST /api/flow/resolve` endpoint. (Recommended for demo — simple and responsive.)
3. **State machine**: Flow returns a `SUSPENDED` state to the engine, which stores it. On HITL resolution, the engine re-enters the flow. Cleaner but more complex.

### 8.13 Existing Tables (`agent_tasks`, `artifacts`)

These tables **persist** alongside the new `execution_trace` JSONB:

| Table | Role in new model |
|-------|-------------------|
| `visits` | **Removed** — replaced by flow input context |
| `agent_runs` | **Kept** — `execution_trace` added as JSONB column; `status`, `summary` remain |
| `agent_tasks` | **Kept** — HITL tasks managed via `requestApproval` still create task records for audit |
| `artifacts` | **Kept** — tool handler results still saved as artifacts for reference in step details |

The `execution_trace` JSONB is the primary replay data source. Tasks and artifacts provide supplementary detail for the expanded step view.
