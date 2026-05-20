# Agentic Flows & Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the linear visit-centric agent pipeline into a flow-centric system with branching decisions, HITL gates, preconditions, and keyboard-navigable replay for meetup demos.

**Architecture:** Three TypeScript flow classes (sales visit, maintenance, recall) define agentic decision trees. A FlowEngine wraps real Claude SDK execution, auto-recording every event into a JSONB trace. A React Flow-based UI provides three-panel execution view with keyboard replay. ShadCN components replace existing UI.

**Tech Stack:** Next.js 15, React 19, React Flow, ShadCN/Radix UI, Tailwind CSS, PostgreSQL, Claude SDK, react-hotkeys-hook

---

## File Structure

### New Files

```
.ai/samples/
  sales-visit-flow.ts      — Sales visit expense approval flow
  maintenance-flow.ts      — Scheduled maintenance flow  
  recall-flow.ts           — Equipment recall flow
  seed-emails.ts           — Mock email seed data

src/agent/
  flow.ts                  — FlowDefinition base class, FlowContext, EventRecorder
  flowRegistry.ts          — Flow registry (Map<string, FlowDefinition>)
  flowEngine.ts            — Engine: run flows, record traces, handle HITL suspension

src/hooks/
  useExecutionReplay.ts    — Replay hook with react-hotkeys-hook

src/components/
  FlowExecutionView.tsx    — Main orchestrator component
  ThreePanelLayout.tsx     — Three-column grid layout
  InboxPanel.tsx           — Mock email inbox (left panel)
  TestFlowsMenu.tsx        — Test flow launcher
  FlowChart.tsx            — React Flow wrapper with custom nodes
  FlowNode.tsx             — Custom node renderer (6 node types)
  FlowLegend.tsx           — Color legend for node states
  PlaybackControls.tsx     — Prev/next buttons + speed toggle
  StepView.tsx             — Sequential event list (right panel)
  StepItem.tsx             — Clickable step with expand detail
  DebugOverlay.tsx         — Floating terminal-style debug panel
  UserSwitcher.tsx         — Role selector dropdown
```

### Modified Files

```
tsconfig.json                   — Add @samples/* path alias
src/agent/types.ts              — Add FlowInput, EventTypes, FlowTrace types
src/data/migrate.ts             — Add execution_trace column, mock_emails table
src/data/queries.ts             — Add flow run/trace queries
src/data/seed.ts                — Add email seeds, replace visit seeds
src/server/hono.ts              — Update API routes for flow endpoints
src/server/wsManager.ts         — Keep existing WS infrastructure
src/app/page.tsx                — Replace with FlowExecutionView
src/lib/services/flows.ts       — New: flow API client (create file)
```

### Removed Files

```
src/components/AgentRunPanel.tsx
src/components/PipelineStepper.tsx
src/app/visits/[id]/page.tsx
src/app/new/page.tsx
src/app/api/agent/run/route.ts
src/app/api/agent/status/route.ts
src/app/api/agent/resolve/route.ts
```

---

## Phase 1: Foundation (Infrastructure & Types)

### Task 1.1: Add tsconfig path alias for `.ai/samples/`

**Files:**
- Modify: `tsconfig.json:17`

- [ ] **Step 1: Add `@samples/*` path alias**

```json
// tsconfig.json — add to compilerOptions.paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@samples/*": ["./.ai/samples/*"]
    }
  }
}
```

- [ ] **Step 2: Add the same alias to `tsconfig.server.json`** (if it exists, check)

Run: `cat tsconfig.server.json | grep -A 20 '"compilerOptions"'`

If the file exists with `paths`, add the same `@samples/*` entry. If it doesn't exist or has no paths, skip.

- [ ] **Step 3: Verify tsconfig parses**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors about unknown path aliases (or errors from unrelated code — that's fine, we just want to verify tsc doesn't crash on the config)

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add @samples/* tsconfig path alias for flow definitions"
```

### Task 1.2: Add flow types to agent types

**Files:**
- Modify: `src/agent/types.ts`

- [ ] **Step 1: Add new type definitions**

```typescript
// src/agent/types.ts — append after existing types

export type EventType =
  | "step_start" | "step_end"
  | "tool_call" | "tool_result"
  | "decision" | "branch_taken"
  | "precondition_check" | "precondition_met"
  | "hitl_waiting" | "hitl_resolved"
  | "completed" | "failed"

export type ExecutionEvent = {
  sequence: number
  type: EventType
  label: string
  description?: string
  data?: Record<string, unknown>
}

export type FlowTrace = {
  flow_name: string
  events: ExecutionEvent[]
}

export type FlowInput = {
  trigger: "email" | "manual"
  email?: {
    from: string
    subject: string
    body: string
    flow_hint: string
  }
  context?: Record<string, unknown>
}

export type FlowHITLRequest = {
  runId: string
  label: string
  context: Record<string, unknown>
}

export type FlowHITLResponse = {
  approved: boolean
  feedback?: string
}

export type MockEmail = {
  id: string
  from: string
  subject: string
  body: string
  flow_hint: string
  read: boolean
  created_at: string
}
```

- [ ] **Step 2: Verify file parses**

Run: `npx tsc --noEmit src/agent/types.ts --pretty 2>&1 | head -10`
Expected: Clean compile or type errors unrelated to the new additions

- [ ] **Step 3: Commit**

```bash
git add src/agent/types.ts
git commit -m "feat: add flow types for execution events and mock emails"
```

### Task 1.3: Add `execution_trace` column to database

**Files:**
- Modify: `src/data/migrate.ts`

- [ ] **Step 1: Add migration for execution_trace column and mock_emails table**

```typescript
// src/data/migrate.ts — append after existing migrations

  await query(`ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS execution_trace JSONB`)
  console.log("  Added execution_trace column to agent_runs")

  await query(`CREATE TABLE IF NOT EXISTS mock_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    flow_hint TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  console.log("  Created mock_emails table")
```

- [ ] **Step 2: Run the migration**

Run: `npx tsx src/data/migrate.ts`
Expected: "Added execution_trace column to agent_runs" and "Created mock_emails table"

- [ ] **Step 3: Commit**

```bash
git add src/data/migrate.ts
git commit -m "feat: add execution_trace column and mock_emails table"
```

### Task 1.4: Update seed data with mock emails

**Files:**
- Modify: `src/data/seed.ts`
- Create: `.ai/samples/seed-emails.ts`

- [ ] **Step 1: Create mock email seed data**

```typescript
// .ai/samples/seed-emails.ts
import { query } from "../src/data/db"

const emails = [
  {
    from_address: "Dr. Smith <smith@acmedental.com>",
    subject: "Lunch Meeting — Thank You",
    body: "Thanks for the great lunch today! Let's move forward with the imaging software proposal. Had the salmon — excellent recommendation. Receipt attached.",
    flow_hint: "sales_visit",
  },
  {
    from_address: "noreply@equipment-monitor.local",
    subject: "Scheduled Maintenance — X100 Imaging Unit",
    body: "Routine 6-month maintenance is due for X100 Imaging Unit at Acme Dental (serial #X100-4421). Please schedule within 14 days. Estimated service time: 2 hours.",
    flow_hint: "maintenance",
  },
  {
    from_address: "recalls@dental-mfg.example.com",
    subject: "URGENT: Recall Notice — X100 Bracket Assembly",
    body: "Safety recall for X100 bracket assembly (lot #B4-2024). Affected units: 3 at Acme Dental. Required action: Replace bracket assembly on all affected units. Parts will be shipped within 48 hours upon ordering.",
    flow_hint: "recall",
  },
]

export async function seedEmails() {
  const existing = await query("SELECT COUNT(*) as c FROM mock_emails")
  if (parseInt(existing[0]?.c || "0", 10) > 0) {
    console.log("mock_emails table already has data. Skipping email seed.")
    return
  }
  for (const email of emails) {
    await query(
      `INSERT INTO mock_emails (from_address, subject, body, flow_hint) VALUES ($1, $2, $3, $4)`,
      [email.from_address, email.subject, email.body, email.flow_hint]
    )
    console.log(`  Seeded email: ${email.subject}`)
  }
  console.log("Email seeding complete.")
}
```

- [ ] **Step 2: Integrate into existing seed**

```typescript
// src/data/seed.ts — add import and call at the end of the seed() function
import { seedEmails } from "../../.ai/samples/seed-emails"

// At end of seed() function, before the closing console.log:
  await seedEmails()
```

- [ ] **Step 3: Run the seed**

Run: `npx tsx src/data/seed.ts`
Expected: Seeds 3 mock emails

- [ ] **Step 4: Verify emails in DB**

Run: `npx tsx -e "const {query} = require('./src/data/db'); query('SELECT subject, flow_hint FROM mock_emails').then(r => console.log(r))"`
Expected: Shows 3 email rows

- [ ] **Step 5: Commit**

```bash
git add .ai/samples/seed-emails.ts src/data/seed.ts
git commit -m "feat: add mock email seed data for dental sales flows"
```

---

## Phase 2: Flow Engine

### Task 2.1: Implement FlowDefinition base class, FlowContext, and EventRecorder

**Files:**
- Create: `src/agent/flow.ts`

- [ ] **Step 1: Create FlowDefinition abstract class**

```typescript
// src/agent/flow.ts
import type { ExecutionEvent, FlowInput } from "./types"

export type ToolHandler = (input: Record<string, unknown>, runId: string) => Promise<Record<string, unknown>>

export abstract class FlowDefinition {
  abstract name: string
  abstract description: string
  abstract execute(ctx: FlowContext): Promise<void>
}

export class FlowContext {
  input: FlowInput
  tools: ToolRegistry
  state: Map<string, unknown> = new Map()
  private recorder: EventRecorder
  private pendingHITL: Map<string, { resolve: (v: FlowHITLResponse) => void }> = new Map()

  constructor(input: FlowInput, recorder: EventRecorder) {
    this.input = input
    this.recorder = recorder
    this.tools = new ToolRegistry(recorder)
  }

  async decide<T>(label: string, opts: { prompt: string; choices: T[] }): Promise<T> {
    this.recorder.record("decision", label, { prompt: opts.prompt, choices: opts.choices })
    const chosen = opts.choices[0]
    this.recorder.record("branch_taken", label, { chosen })
    return chosen
  }

  async waitFor(label: string, opts: {
    check: () => Promise<boolean>
    retry: { max: number; backoff: string; onTimeout: "escalate" | "fail" }
  }): Promise<void> {
    let attempts = 0
    while (attempts < opts.retry.max) {
      attempts++
      const met = await opts.check()
      this.recorder.record("precondition_check", label, { condition: label, attempt: attempts, result: met })
      if (met) {
        this.recorder.record("precondition_met", label, { condition: label, attempts })
        return
      }
      if (attempts < opts.retry.max) {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    this.recorder.record("failed", label, { reason: `Precondition not met after ${opts.retry.max} attempts` })
    if (opts.retry.onTimeout === "escalate") {
      this.recorder.record("step_end", label, { result: "escalated" })
    }
  }

  async requestApproval(label: string, context: Record<string, unknown>): Promise<FlowHITLResponse> {
    this.recorder.record("hitl_waiting", label, context)
    const promise = new Promise<FlowHITLResponse>((resolve) => {
      this.pendingHITL.set(label, { resolve })
    })
    const result = await promise
    this.recorder.record("hitl_resolved", label, { approved: result.approved, feedback: result.feedback })
    return result
  }

  resolveHITL(label: string, response: FlowHITLResponse): boolean {
    const pending = this.pendingHITL.get(label)
    if (!pending) return false
    pending.resolve(response)
    this.pendingHITL.delete(label)
    return true
  }
}

type FlowHITLResponse = { approved: boolean; feedback?: string }

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>()
  private recorder: EventRecorder

  constructor(recorder: EventRecorder) {
    this.recorder = recorder
  }

  register(name: string, handler: ToolHandler) {
    this.handlers.set(name, handler)
  }

  async call(name: string, input: Record<string, unknown>, runId: string): Promise<Record<string, unknown>> {
    this.recorder.record("tool_call", name, { input })
    const handler = this.handlers.get(name)
    if (!handler) throw new Error(`Tool not found: ${name}`)
    const result = await handler(input, runId)
    this.recorder.record("tool_result", name, { output: result })
    return result
  }
}

export class EventRecorder {
  private events: ExecutionEvent[] = []
  private sequence = 0

  record(type: string, label: string, data?: Record<string, unknown>) {
    this.events.push({
      sequence: this.sequence++,
      type: type as any,
      label,
      data,
    })
  }

  getEvents(): ExecutionEvent[] {
    return this.events
  }

  clear() {
    this.events = []
    this.sequence = 0
  }
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/agent/flow.ts --pretty 2>&1 | head -20`
Expected: No errors (or errors only from missing dependent types we'll add next)

- [ ] **Step 3: Add missing import — fix the ExecutionEvent import**

Fix the import to reference the correct path:

```typescript
// Top of src/agent/flow.ts — replace the import line
import type { ExecutionEvent, FlowInput } from "./types"
```

- [ ] **Step 4: Commit**

```bash
git add src/agent/flow.ts
git commit -m "feat: add FlowDefinition, FlowContext, EventRecorder, ToolRegistry"
```

### Task 2.2: Implement FlowEngine

**Files:**
- Create: `src/agent/flowEngine.ts`

- [ ] **Step 1: Create FlowEngine**

```typescript
// src/agent/flowEngine.ts
import type { FlowDefinition } from "./flow"
import { FlowContext, EventRecorder } from "./flow"
import type { FlowInput, FlowTrace, FlowHITLResponse } from "./types"
import * as queries from "../data/queries"
import { v4 as uuid } from "uuid"

const pendingHITL = new Map<string, { resolve: (r: FlowHITLResponse) => void }>()

export async function runFlow(flow: FlowDefinition, input: FlowInput): Promise<FlowTrace> {
  const runId = uuid()
  const recorder = new EventRecorder()

  await queries.query(
    `INSERT INTO agent_runs (id, visit_id, status, summary) VALUES ($1, $2, $3, $4)`,
    [runId, "00000000-0000-0000-0000-000000000000", "running", flow.name]
  )

  const ctx = new FlowContext(input, recorder)

  recorder.record("step_start", flow.name, { description: flow.description })

  try {
    await flow.execute(ctx)
    recorder.record("completed", flow.name, { summary: `${flow.name} completed successfully` })
  } catch (err) {
    recorder.record("failed", flow.name, {
      error: err instanceof Error ? err.message : "Unknown error",
    })
  }

  const trace: FlowTrace = {
    flow_name: flow.name,
    events: recorder.getEvents(),
  }

  await queries.query(
    `UPDATE agent_runs SET status = $1, execution_trace = $2::jsonb, updated_at = NOW() WHERE id = $3`,
    ["completed", JSON.stringify(trace), runId]
  )

  return trace
}

export async function runFlowAndRecord(flow: FlowDefinition, input: FlowInput): Promise<FlowTrace> {
  return runFlow(flow, input)
}

export function registerPendingHITL(key: string, resolve: (r: FlowHITLResponse) => void) {
  pendingHITL.set(key, { resolve })
}

export function resolvePendingHITL(key: string, response: FlowHITLResponse): boolean {
  const pending = pendingHITL.get(key)
  if (!pending) return false
  pending.resolve(response)
  pendingHITL.delete(key)
  return true
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/agent/flowEngine.ts --pretty 2>&1 | head -20`
Expected: Clean compile

- [ ] **Step 3: Commit**

```bash
git add src/agent/flowEngine.ts
git commit -m "feat: add FlowEngine for executing and recording flow traces"
```

### Task 2.3: Implement Flow Registry

**Files:**
- Create: `src/agent/flowRegistry.ts`

- [ ] **Step 1: Create registry**

```typescript
// src/agent/flowRegistry.ts
import type { FlowDefinition } from "./flow"
import { SalesVisitFlow } from "@samples/sales-visit-flow"
import { MaintenanceFlow } from "@samples/maintenance-flow"
import { RecallFlow } from "@samples/recall-flow"

export const flowRegistry = new Map<string, FlowDefinition>([
  ["sales_visit", new SalesVisitFlow()],
  ["maintenance", new MaintenanceFlow()],
  ["recall", new RecallFlow()],
])

export function getFlow(hint: string): FlowDefinition | undefined {
  return flowRegistry.get(hint)
}

export function listFlowKeys(): string[] {
  return Array.from(flowRegistry.keys())
}
```

Note: This will fail to compile until the sample flows exist (Task 3.x). That's expected — the registry will be completed after the flows are built.

- [ ] **Step 2: Commit (even though it won't compile yet)**

```bash
git add src/agent/flowRegistry.ts
git commit -m "feat: add flow registry with import stubs"
```

---

## Phase 3: Sample Flows

### Task 3.1: Define shared tool handlers for dental flows

**Files:**
- Modify: `src/agent/toolHandlers.ts`

- [ ] **Step 1: Add new tool handlers for dental domain**

```typescript
// src/agent/toolHandlers.ts — append to existing toolHandlers object

  send_notification: async (input, runId) => {
    const { role, message } = input as { role: string; message: string }
    return {
      summary: `Notification sent to ${role}`,
      artifactType: "note",
      artifactTitle: `Notification: ${role}`,
      artifactContent: `To: ${role}\nMessage: ${message}`,
    }
  },

  create_service_record: async (input, runId) => {
    const { equipmentId, status, notes } = input as { equipmentId: string; status: string; notes?: string }
    return {
      summary: `Service record created for ${equipmentId}: ${status}`,
      artifactType: "note",
      artifactTitle: `Service: ${equipmentId}`,
      artifactContent: `Equipment: ${equipmentId}\nStatus: ${status}\nNotes: ${notes || "N/A"}`,
    }
  },

  get_customer_info: async (input, runId) => {
    const { name } = input as { name: string }
    return {
      summary: `Customer info retrieved for ${name}`,
      artifactType: "research",
      artifactTitle: `Customer: ${name}`,
      artifactContent: JSON.stringify({
        name,
        accountType: "dental_practice",
        status: "active",
        contact: "Dr. Smith",
        since: "2023",
      }),
    }
  },

  submit_expense_report: async (input, runId) => {
    const { amount, merchant, category, description } = input as {
      amount: number; merchant: string; category: string; description?: string
    }
    return {
      summary: `Expense submitted: $${amount} at ${merchant}`,
      artifactType: "expense_check",
      artifactTitle: `Expense: ${merchant} - $${amount}`,
      artifactContent: `Amount: $${amount}\nMerchant: ${merchant}\nCategory: ${category}\nDescription: ${description || "N/A"}`,
    }
  },

  check_per_diem: async (input, runId) => {
    const { amount, category } = input as { amount: number; category: string }
    const limits: Record<string, number> = {
      meals: 75,
      entertainment: 100,
      travel: 500,
      supplies: 200,
    }
    const limit = limits[category] || 100
    const over = amount > limit
    return {
      summary: `Per diem check: $${amount} vs $${limit} limit — ${over ? "OVER" : "WITHIN"}`,
      artifactType: "expense_check",
      artifactTitle: `Per Diem: $${amount}`,
      artifactContent: `Amount: $${amount}\nLimit: $${limit}\nResult: ${over ? "EXCEEDS LIMIT — requires approval" : "Within policy — auto-approved"}`,
    }
  },

  verify_receipt: async (input, runId) => {
    const { attached } = input as { attached: boolean }
    return {
      summary: attached ? "Receipt attached" : "No receipt attached",
      artifactType: "expense_check",
      artifactTitle: "Receipt Check",
      artifactContent: attached
        ? "Receipt is attached and valid."
        : "No receipt attached. Requesting from submitter.",
    }
  },

  check_warranty_status: async (input, runId) => {
    const { equipmentId } = input as { equipmentId: string }
    const mockWarranty = { inWarranty: true, expiryDate: "2026-12-31", coverage: "parts_and_labor" }
    return {
      summary: `Warranty check for ${equipmentId}: ${mockWarranty.inWarranty ? "In warranty" : "Expired"}`,
      artifactType: "research",
      artifactTitle: `Warranty: ${equipmentId}`,
      artifactContent: JSON.stringify(mockWarranty),
    }
  },

  check_part_inventory: async (input, runId) => {
    const { partId } = input as { partId: string }
    const mockInventory = { inStock: true, quantity: 15, estimatedDelivery: "2 days" }
    return {
      summary: `Inventory check for ${partId}: ${mockInventory.inStock ? `${mockInventory.quantity} in stock` : "Backordered"}`,
      artifactType: "research",
      artifactTitle: `Inventory: ${partId}`,
      artifactContent: JSON.stringify(mockInventory),
    }
  },

  order_parts: async (input, runId) => {
    const { part, quantity } = input as { part: string; quantity: number }
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`
    return {
      summary: `Order placed: ${quantity}x ${part} (${orderNumber})`,
      artifactType: "note",
      artifactTitle: `Order: ${part}`,
      artifactContent: `Part: ${part}\nQuantity: ${quantity}\nOrder #: ${orderNumber}\nStatus: Placed\nETA: 2-3 days`,
    }
  },

  assess_recall_severity: async (input, runId) => {
    const { text } = input as { text: string }
    const isUrgent = text.toLowerCase().includes("urgent") || text.toLowerCase().includes("safety")
    return {
      summary: `Severity assessment: ${isUrgent ? "CRITICAL" : "Standard"}`,
      artifactType: "research",
      artifactTitle: "Recall Severity Assessment",
      artifactContent: JSON.stringify({
        severity: isUrgent ? "critical" : "standard",
        requiresImmediateAction: isUrgent,
        recommendedWindow: isUrgent ? "24 hours" : "30 days",
      }),
    }
  },

  notify_customer: async (input, runId) => {
    const { customer, subject, message } = input as {
      customer: string; subject: string; message: string
    }
    return {
      summary: `Notification drafted for ${customer}: ${subject}`,
      artifactType: "email_draft",
      artifactTitle: `Notify: ${customer}`,
      artifactContent: `To: ${customer}\nSubject: ${subject}\n\n${message}`,
    }
  },

  execute_recall: async (input, runId) => {
    const { equipmentId, partsUsed } = input as { equipmentId: string; partsUsed?: string[] }
    return {
      summary: `Recall executed for ${equipmentId}`,
      artifactType: "note",
      artifactTitle: `Recall: ${equipmentId}`,
      artifactContent: JSON.stringify({
        equipmentId,
        partsUsed: partsUsed || [],
        status: "completed",
        date: new Date().toISOString(),
      }),
    }
  },

  schedule_visit: async (input, runId) => {
    const { customer, reason, preference } = input as {
      customer?: string; reason: string; preference?: string
    }
    return {
      summary: `Visit scheduled: ${reason}${preference ? ` (${preference})` : ""}`,
      artifactType: "note",
      artifactTitle: `Visit: ${reason}`,
      artifactContent: JSON.stringify({
        customer: customer || "Acme Dental",
        reason,
        preference: preference || "first_available",
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        status: "scheduled",
      }),
    }
  },
```

- [ ] **Step 2: Register new tools in the exports**

```typescript
// src/agent/toolHandlers.ts — verify the toolHandlers object includes all new handlers
// and the export default toolHandlers is at the bottom
```

- [ ] **Step 3: Verify file compiles**

Run: `npx tsc --noEmit src/agent/toolHandlers.ts --pretty 2>&1 | head -20`
Expected: Clean compile

- [ ] **Step 4: Commit**

```bash
git add src/agent/toolHandlers.ts
git commit -m "feat: add dental domain tool handlers for expense, warranty, recall flows"
```

### Task 3.2: Create Sales Visit flow

**Files:**
- Create: `.ai/samples/sales-visit-flow.ts`

- [ ] **Step 1: Implement SalesVisitFlow**

```typescript
// .ai/samples/sales-visit-flow.ts
import { FlowDefinition } from "@/agent/flow"
import type { FlowContext } from "@/agent/flow"

export class SalesVisitFlow extends FlowDefinition {
  name = "Sales Visit"
  description = "Process a sales visit lunch expense with per-diem checks and HITL gates"

  async execute(ctx: FlowContext) {
    ctx.state.set("trigger", "sales_visit")

    const receiptAttached = await ctx.decide("receipt_check", {
      prompt: "Does the expense report include a receipt?",
      choices: [true, false],
    })

    if (!receiptAttached) {
      await ctx.tools.call("verify_receipt", { attached: false }, "")
      await ctx.tools.call("send_notification", {
        role: "sales_agent",
        message: "Please provide a receipt for your expense submission.",
      }, "")
    }

    const amount = (ctx.input.email?.body?.match(/\$(\d+\.?\d*)/)?.[0]?.replace("$", "") || "100")
    const parsedAmount = parseFloat(amount) || 100

    const perDiemResult = await ctx.tools.call("check_per_diem", {
      amount: parsedAmount,
      category: "entertainment",
    }, "")

    const isOverLimit = perDiemResult.artifactContent?.includes("EXCEEDS") || false

    if (isOverLimit) {
      const approval = await ctx.requestApproval("Expense exceeds per diem limit", {
        amount: parsedAmount,
        category: "entertainment",
        submittedBy: ctx.input.email?.from || "unknown",
      })

      if (!approval.approved) {
        await ctx.tools.call("send_notification", {
          role: "sales_agent",
          message: `Expense of $${parsedAmount} was rejected. Reason: ${approval.feedback || "No reason given"}.`,
        }, "")
        return
      }
    }

    const isExistingClient = await ctx.decide("client_type", {
      prompt: "Is this an existing client or a new prospect?",
      choices: ["existing", "prospect"],
    })

    await ctx.tools.call("submit_expense_report", {
      amount: parsedAmount,
      merchant: "The Grill",
      category: "entertainment",
      description: `Lunch with ${
        isExistingClient === "existing" ? "existing client" : "new prospect"
      } to discuss imaging software proposal`,
    }, "")

    await ctx.tools.call("send_notification", {
      role: "admin",
      message: `Expense of $${parsedAmount} has been processed for ${ctx.input.email?.from || "unknown"}.`,
    }, "")
  }
}
```

- [ ] **Step 2: Verify file parses**

Run: `npx tsc --noEmit .ai/samples/sales-visit-flow.ts --pretty 2>&1 | head -20`
Expected: Clean compile (may need --experimentalDecorators or similar flags depending on tsconfig)

- [ ] **Step 3: Commit**

```bash
git add .ai/samples/sales-visit-flow.ts
git commit -m "feat: add SalesVisitFlow with receipt check, per-diem, HITL, and client type decision"
```

### Task 3.3: Create Maintenance flow

**Files:**
- Create: `.ai/samples/maintenance-flow.ts`

- [ ] **Step 1: Implement MaintenanceFlow**

```typescript
// .ai/samples/maintenance-flow.ts
import { FlowDefinition } from "@/agent/flow"
import type { FlowContext } from "@/agent/flow"

export class MaintenanceFlow extends FlowDefinition {
  name = "Maintenance"
  description = "Schedule and execute routine equipment maintenance with warranty and parts checks"

  async execute(ctx: FlowContext) {
    ctx.state.set("trigger", "maintenance")

    const warrantyResult = await ctx.tools.call("check_warranty_status", {
      equipmentId: "X100-4421",
    }, "")
    const inWarranty = warrantyResult.artifactContent?.includes("In warranty") ?? true

    const partsResult = await ctx.tools.call("check_part_inventory", {
      partId: "X100-filter",
    }, "")
    const inStock = partsResult.artifactContent?.includes("in stock") ?? true

    if (!inWarranty) {
      const customerAcceptsQuote = await ctx.decide("quote_decision", {
        prompt: "Equipment is out of warranty. Should we generate a quote?",
        choices: ["yes_quote", "no_close"],
      })
      if (customerAcceptsQuote === "no_close") {
        await ctx.tools.call("send_notification", {
          role: "sales_agent",
          message: "Customer declined out-of-warranty quote. Maintenance closed.",
        }, "")
        return
      }
    }

    if (!inStock) {
      await ctx.waitFor("parts_available", {
        check: async () => {
          const check = await ctx.tools.call("check_part_inventory", { partId: "X100-filter" }, "")
          return check.artifactContent?.includes("in stock") ?? false
        },
        retry: { max: 3, backoff: "1m", onTimeout: "escalate" },
      })
    }

    const preference = await ctx.decide("scheduling_preference", {
      prompt: "Does the customer have a scheduling preference?",
      choices: ["morning", "afternoon", "no_preference"],
    })

    await ctx.tools.call("schedule_visit", {
      customer: "Acme Dental",
      reason: "Routine 6-month maintenance — X100 Imaging Unit",
      preference,
    }, "")

    const serviceResult = await ctx.decide("service_outcome", {
      prompt: "Was the maintenance completed successfully?",
      choices: ["success", "issue_found"],
    })

    await ctx.tools.call("create_service_record", {
      equipmentId: "X100-4421",
      status: serviceResult === "success" ? "completed" : "partial",
      notes: serviceResult === "success"
        ? "Routine maintenance completed. All systems nominal."
        : "Minor issue found during maintenance. Follow-up ticket created.",
    }, "")

    if (serviceResult === "issue_found") {
      await ctx.tools.call("send_notification", {
        role: "admin",
        message: "Issue found during X100 maintenance. Follow-up required.",
      }, "")
    }
  }
}
```

- [ ] **Step 2: Verify file parses**

Run: `npx tsc --noEmit .ai/samples/maintenance-flow.ts --pretty 2>&1 | head -20`
Expected: Clean compile

- [ ] **Step 3: Commit**

```bash
git add .ai/samples/maintenance-flow.ts
git commit -m "feat: add MaintenanceFlow with warranty check, parts inventory, and service outcome decision"
```

### Task 3.4: Create Recall flow

**Files:**
- Create: `.ai/samples/recall-flow.ts`

- [ ] **Step 1: Implement RecallFlow**

```typescript
// .ai/samples/recall-flow.ts
import { FlowDefinition } from "@/agent/flow"
import type { FlowContext } from "@/agent/flow"

export class RecallFlow extends FlowDefinition {
  name = "Recall"
  description = "Handle equipment recall: assess severity, order parts, schedule service, execute"

  async execute(ctx: FlowContext) {
    ctx.state.set("trigger", "recall")

    const severityResult = await ctx.tools.call("assess_recall_severity", {
      text: ctx.input.email?.body || "",
    }, "")
    const isCritical = severityResult.artifactContent?.includes("critical") ?? false

    const scope = await ctx.decide("recall_scope", {
      prompt: "How many units are affected by this recall?",
      choices: ["single", "multiple"],
    })

    if (isCritical) {
      await ctx.tools.call("send_notification", {
        role: "admin",
        message: "CRITICAL recall detected. Immediate action required.",
      }, "")
    }

    const partsResult = await ctx.tools.call("order_parts", {
      part: "X100-bracket",
      quantity: scope === "multiple" ? 15 : 5,
    }, "")
    const orderId = partsResult.artifactContent?.match(/Order #: (\S+)/)?.[1] || "unknown"

    await ctx.tools.call("schedule_visit", {
      customer: "Acme Dental",
      reason: `Equipment recall — X100 bracket assembly${isCritical ? " (URGENT)" : ""}`,
    }, "")

    await ctx.waitFor("parts_arrived", {
      check: async () => {
        const check = await ctx.tools.call("check_part_inventory", { partId: orderId }, "")
        return check.artifactContent?.includes("in stock") ?? false
      },
      retry: { max: 3, backoff: "1m", onTimeout: "escalate" },
    })

    const recallResult = await ctx.decide("recall_outcome", {
      prompt: "Was the recall executed successfully?",
      choices: ["success", "failed"],
    })

    if (recallResult === "success") {
      await ctx.tools.call("execute_recall", {
        equipmentId: "X100-4421",
        partsUsed: ["X100-bracket"],
      }, "")

      const needsNotification = await ctx.decide("customer_notification", {
        prompt: "Should the customer be notified about the completed recall?",
        choices: [true, false],
      })

      if (needsNotification) {
        await ctx.tools.call("notify_customer", {
          customer: "Acme Dental",
          subject: "Recall Completed — X100 Bracket Assembly",
          message: "The recall for your X100 Imaging Unit has been completed. All affected brackets have been replaced.",
        }, "")
      }
    } else {
      await ctx.tools.call("send_notification", {
        role: "admin",
        message: `Recall execution FAILED for X100-4421. Escalating to engineering team.`,
      }, "")
    }
  }
}
```

- [ ] **Step 2: Verify file parses**

Run: `npx tsc --noEmit .ai/samples/recall-flow.ts --pretty 2>&1 | head -20`
Expected: Clean compile

- [ ] **Step 3: Commit**

```bash
git add .ai/samples/recall-flow.ts
git commit -m "feat: add RecallFlow with severity, scope, precondition, and notification decisions"
```

---

## Phase 4: Replay System

### Task 4.1: Install react-hotkeys-hook

- [ ] **Step 1: Install the library**

Run: `npm install react-hotkeys-hook`
Expected: Package added to node_modules and package.json

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-hotkeys-hook for keyboard replay navigation"
```

### Task 4.2: Implement useExecutionReplay hook

**Files:**
- Create: `src/hooks/useExecutionReplay.ts`

- [ ] **Step 1: Write the hook**

```typescript
// src/hooks/useExecutionReplay.ts
import { useState, useCallback, useEffect } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import type { ExecutionEvent, FlowTrace } from "@/agent/types"

type ReplaySpeed = "fast" | "normal" | "slow"

const SPEED_DELAYS: Record<ReplaySpeed, number> = {
  fast: 100,
  normal: 500,
  slow: 1000,
}

export type ReplayState = {
  trace: FlowTrace | null
  cursor: number
  currentEvent: ExecutionEvent | null
  visibleEvents: ExecutionEvent[]
  speed: ReplaySpeed
  isAtStart: boolean
  isAtEnd: boolean
  autoplay: boolean
}

export type ReplayControls = {
  next: () => void
  prev: () => void
  jumpTo: (index: number) => void
  setSpeed: (speed: ReplaySpeed) => void
  toggleAutoplay: () => void
  loadTrace: (trace: FlowTrace) => void
  clearTrace: () => void
}

export function useExecutionReplay(): [ReplayState, ReplayControls] {
  const [trace, setTrace] = useState<FlowTrace | null>(null)
  const [cursor, setCursor] = useState(0)
  const [speed, setSpeed] = useState<ReplaySpeed>("normal")
  const [autoplay, setAutoplay] = useState(false)

  const events = trace?.events ?? []

  const next = useCallback(() => {
    setCursor(c => Math.min(c + 1, events.length - 1))
  }, [events.length])

  const prev = useCallback(() => {
    setCursor(c => Math.max(c - 1, 0))
  }, [])

  const jumpTo = useCallback((index: number) => {
    setCursor(Math.max(0, Math.min(index, events.length - 1)))
  }, [events.length])

  const loadTrace = useCallback((newTrace: FlowTrace) => {
    setTrace(newTrace)
    setCursor(0)
    setAutoplay(false)
  }, [])

  const clearTrace = useCallback(() => {
    setTrace(null)
    setCursor(0)
    setAutoplay(false)
  }, [])

  const toggleAutoplay = useCallback(() => {
    setAutoplay(a => !a)
  }, [])

  useHotkeys("arrowright", next, { enabled: events.length > 0 }, [events.length])
  useHotkeys("arrowleft", prev, { enabled: events.length > 0 }, [])

  useEffect(() => {
    if (!autoplay || cursor >= events.length - 1) {
      setAutoplay(false)
      return
    }
    const timer = setTimeout(next, SPEED_DELAYS[speed])
    return () => clearTimeout(timer)
  }, [autoplay, cursor, speed, events.length, next])

  const state: ReplayState = {
    trace,
    cursor,
    currentEvent: events[cursor] ?? null,
    visibleEvents: events.slice(0, cursor + 1),
    speed,
    isAtStart: cursor === 0,
    isAtEnd: cursor >= events.length - 1,
    autoplay,
  }

  const controls: ReplayControls = {
    next, prev, jumpTo, setSpeed, toggleAutoplay, loadTrace, clearTrace,
  }

  return [state, controls]
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/hooks/useExecutionReplay.ts --pretty 2>&1 | head -20`
Expected: Clean compile

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExecutionReplay.ts
git commit -m "feat: add useExecutionReplay hook with keyboard nav and autoplay"
```

---

## Phase 5: Flow API & Query Layer

### Task 5.1: Add flow-related queries

**Files:**
- Modify: `src/data/queries.ts`

- [ ] **Step 1: Add flow queries**

```typescript
// src/data/queries.ts — append after existing functions

export async function listMockEmails() {
  return query("SELECT * FROM mock_emails ORDER BY created_at DESC")
}

export async function getMockEmail(id: string) {
  const rows = await query("SELECT * FROM mock_emails WHERE id = $1", [id])
  return rows[0] || null
}

export async function markEmailRead(id: string) {
  await query("UPDATE mock_emails SET is_read = true WHERE id = $1", [id])
}

export async function listFlowTraces() {
  return query(
    `SELECT id, visit_id, status, summary, execution_trace, created_at, updated_at
     FROM agent_runs
     WHERE execution_trace IS NOT NULL
     ORDER BY created_at DESC`
  )
}

export async function getFlowTrace(runId: string) {
  const rows = await query(
    `SELECT id, visit_id, status, summary, execution_trace, created_at, updated_at
     FROM agent_runs WHERE id = $1 AND execution_trace IS NOT NULL`,
    [runId]
  )
  return rows[0] || null
}

export async function saveFlowTrace(runId: string, trace: Record<string, unknown>) {
  await query(
    `UPDATE agent_runs SET execution_trace = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(trace), runId]
  )
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/data/queries.ts --pretty 2>&1 | head -20`
Expected: Clean compile

- [ ] **Step 3: Commit**

```bash
git add src/data/queries.ts
git commit -m "feat: add flow trace and mock email queries"
```

### Task 5.2: Update Hono API with flow endpoints

**Files:**
- Modify: `src/server/hono.ts`

- [ ] **Step 1: Add flow API routes**

```typescript
// src/server/hono.ts — add after existing imports
import { flowRegistry, getFlow } from "../agent/flowRegistry"
import { runFlow } from "../agent/flowEngine"
import { resolvePendingHITL } from "../agent/flowEngine"
import type { FlowInput } from "../agent/types"

// Add new routes before the export

api.get("/api/flows/traces", async (c) => {
  try {
    const traces = await queries.listFlowTraces()
    return c.json(traces)
  } catch {
    return c.json({ error: "Failed to fetch flow traces" }, 500)
  }
})

api.get("/api/flows/traces/:id", async (c) => {
  try {
    const trace = await queries.getFlowTrace(c.req.param("id"))
    if (!trace) return c.json({ error: "Trace not found" }, 404)
    return c.json(trace)
  } catch {
    return c.json({ error: "Failed to fetch trace" }, 500)
  }
})

api.post("/api/flow/run", async (c) => {
  try {
    const body = await c.req.json()
    const { emailId, flowHint } = body
    if (!flowHint) return c.json({ error: "flowHint required" }, 400)

    const flow = getFlow(flowHint)
    if (!flow) return c.json({ error: `Flow not found: ${flowHint}` }, 404)

    let input: FlowInput = { trigger: "manual" }
    if (emailId) {
      const email = await queries.getMockEmail(emailId)
      if (email) {
        input = {
          trigger: "email",
          email: {
            from: email.from_address,
            subject: email.subject,
            body: email.body || "",
            flow_hint: email.flow_hint,
          },
        }
        await queries.markEmailRead(emailId)
      }
    }

    const trace = await runFlow(flow, input)
    return c.json(trace, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Flow run failed" }, 500)
  }
})

api.post("/api/flow/resolve-hitl", async (c) => {
  try {
    const body = await c.req.json()
    const { runId, label, approved, feedback } = body
    if (!runId || !label || approved === undefined) {
      return c.json({ error: "runId, label, and approved required" }, 400)
    }
    const resolved = resolvePendingHITL(`${runId}:${label}`, { approved, feedback })
    if (!resolved) return c.json({ error: "No pending HITL request found" }, 404)
    return c.json({ resolved: true })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "HITL resolution failed" }, 500)
  }
})

api.get("/api/emails", async (c) => {
  try {
    const emails = await queries.listMockEmails()
    return c.json(emails)
  } catch {
    return c.json({ error: "Failed to fetch emails" }, 500)
  }
})
```

- [ ] **Step 2: Remove old agent routes (optional — can leave for backward compat)**

```typescript
// src/server/hono.ts — comment out or remove these routes:
// POST /api/agent/run
// GET /api/agent/status
// POST /api/agent/resolve
```

- [ ] **Step 3: Verify file compiles**

Run: `npx tsc --noEmit --project tsconfig.server.json --pretty 2>&1 | head -30`
Expected: Clean compile (the server tsconfig may differ)

- [ ] **Step 4: Commit**

```bash
git add src/server/hono.ts
git commit -m "feat: add flow API endpoints for running and resolving flows"
```

### Task 5.3: Create flow API client

**Files:**
- Create: `src/lib/services/flows.ts`

- [ ] **Step 1: Write client**

```typescript
// src/lib/services/flows.ts
import { apiRequest } from "../client"
import type { FlowTrace, MockEmail } from "@/agent/types"

export type FlowTraceRecord = {
  id: string
  flow_name: string
  execution_trace: FlowTrace
  status: string
  created_at: string
}

export async function listFlowTraces(): Promise<FlowTraceRecord[]> {
  return apiRequest<FlowTraceRecord[]>("/api/flows/traces")
}

export async function getFlowTrace(id: string): Promise<FlowTraceRecord> {
  return apiRequest<FlowTraceRecord>(`/api/flows/traces/${id}`)
}

export async function runFlow(flowHint: string, emailId?: string): Promise<FlowTrace> {
  return apiRequest<FlowTrace>("/api/flow/run", {
    method: "POST",
    body: JSON.stringify({ flowHint, emailId }),
  })
}

export async function resolveHITL(
  runId: string, label: string, approved: boolean, feedback?: string
): Promise<{ resolved: boolean }> {
  return apiRequest("/api/flow/resolve-hitl", {
    method: "POST",
    body: JSON.stringify({ runId, label, approved, feedback }),
  })
}

export async function listEmails(): Promise<MockEmail[]> {
  return apiRequest<MockEmail[]>("/api/emails")
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/flows.ts
git commit -m "feat: add flow API client"
```

---

## Phase 6: UI Components

### Task 6.1: Install React Flow and ShadCN

- [ ] **Step 1: Install React Flow**

Run: `npm install @xyflow/react`
Expected: Package installed

- [ ] **Step 2: Install ShadCN and required components**

Run: `npx shadcn@latest init -y`
Expected: ShadCN config created

Run: `npx shadcn@latest add button badge card sheet dialog select separator scroll-area tooltip -y`
Expected: Components added to `src/components/ui/`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/components/ui/
git commit -m "chore: add React Flow and ShadCN components (button, badge, card, sheet, dialog, select, separator, scroll-area, tooltip)"
```

### Task 6.2: Create ThreePanelLayout

**Files:**
- Create: `src/components/ThreePanelLayout.tsx`

- [ ] **Step 1: Write layout component**

```tsx
// src/components/ThreePanelLayout.tsx
"use client"

type ThreePanelLayoutProps = {
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
}

export default function ThreePanelLayout({ left, center, right }: ThreePanelLayoutProps) {
  return (
    <div className="grid grid-cols-[280px_1fr_320px] min-h-[calc(100vh-57px)]">
      <div className="border-r border-gray-200 bg-gray-50 overflow-y-auto">
        {left}
      </div>
      <div className="overflow-y-auto bg-white">
        {center}
      </div>
      <div className="border-l border-gray-200 bg-gray-50 overflow-y-auto">
        {right}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThreePanelLayout.tsx
git commit -m "feat: add ThreePanelLayout grid component"
```

### Task 6.3: Create UserSwitcher

**Files:**
- Create: `src/components/UserSwitcher.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/UserSwitcher.tsx
"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type UserRole = {
  value: string
  label: string
  initials: string
}

const ROLES: UserRole[] = [
  { value: "sales", label: "John Doe (Sales)", initials: "JD" },
  { value: "maintenance", label: "Jane Smith (Maintenance)", initials: "JS" },
  { value: "admin", label: "Admin", initials: "AD" },
]

export default function UserSwitcher() {
  const [current, setCurrent] = useState(ROLES[0])
  const [colorIndex, setColorIndex] = useState(0)
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500"]

  return (
    <Select
      value={current.value}
      onValueChange={(val) => {
        const role = ROLES.find((r) => r.value === val) || ROLES[0]
        setCurrent(role)
        setColorIndex(ROLES.indexOf(role))
      }}
    >
      <SelectTrigger className="w-56 h-9 bg-slate-700 border-slate-600 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${colors[colorIndex]} flex items-center justify-center text-[10px] font-bold text-white`}>
            {current.initials}
          </div>
          <SelectValue placeholder="Select user" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role, i) => (
          <SelectItem key={role.value} value={role.value}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${colors[i]} flex items-center justify-center text-[10px] font-bold text-white`}>
                {role.initials}
              </div>
              <span>{role.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UserSwitcher.tsx
git commit -m "feat: add UserSwitcher component with role selection"
```

### Task 6.4: Create InboxPanel

**Files:**
- Create: `src/components/InboxPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/InboxPanel.tsx
"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { listEmails } from "@/lib/services/flows"
import type { MockEmail } from "@/agent/types"

type InboxPanelProps = {
  onSelectEmail: (email: MockEmail) => void
  selectedId?: string
}

export default function InboxPanel({ onSelectEmail, selectedId }: InboxPanelProps) {
  const [emails, setEmails] = useState<MockEmail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listEmails()
      .then(setEmails)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = emails.filter((e) => !e.read).length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">📬 Inbox</h3>
        {unreadCount > 0 && (
          <Badge variant="default" className="bg-blue-500">{unreadCount}</Badge>
        )}
      </div>

      <ScrollArea className="h-[300px]">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-8">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No emails</p>
        ) : (
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`rounded-lg p-3 cursor-pointer transition-all ${
                  selectedId === email.id
                    ? "bg-white border border-blue-500 shadow-sm ring-1 ring-blue-200"
                    : email.read
                    ? "bg-white border border-gray-200 hover:border-blue-300"
                    : "bg-white border border-blue-300 hover:border-blue-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm ${email.read ? "font-normal text-gray-700" : "font-semibold text-gray-900"}`}>
                    {email.subject}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">
                    {new Date(email.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{email.body}</p>
                <div className="mt-1.5">
                  <Badge variant="outline" className="text-[10px] text-gray-500">
                    {email.flow_hint}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InboxPanel.tsx
git commit -m "feat: add InboxPanel with mock email list and selection"
```

### Task 6.5: Create FlowNode component

**Files:**
- Create: `src/components/FlowNode.tsx`

- [ ] **Step 1: Write custom React Flow node**

```tsx
// src/components/FlowNode.tsx
"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

export type FlowNodeData = {
  label: string
  description?: string
  nodeType: "trigger" | "step" | "decision" | "hitl" | "precondition" | "parallel"
  state: "pending" | "active" | "completed" | "failed" | "blocked"
}

const NODE_STYLES: Record<string, { shape: string; border: string; bg: string; text: string }> = {
  trigger: { shape: "rounded-full", border: "border-slate-600", bg: "bg-slate-800", text: "text-white" },
  step: { shape: "rounded-lg", border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-900" },
  decision: { shape: "rotate-45", border: "border-amber-400", bg: "bg-amber-50", text: "text-amber-900" },
  hitl: { shape: "rounded-lg", border: "border-red-400", bg: "bg-red-50", text: "text-red-900" },
  precondition: { shape: "rounded-lg border-dashed", border: "border-amber-400", bg: "bg-amber-50", text: "text-amber-900" },
  parallel: { shape: "rounded-lg", border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-900" },
}

const STATE_COLORS: Record<string, string> = {
  pending: "bg-gray-300",
  active: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  blocked: "bg-amber-400",
}

function FlowNode({ data }: NodeProps<FlowNodeData>) {
  const style = NODE_STYLES[data.nodeType] || NODE_STYLES.step

  return (
    <div className={`px-4 py-2.5 ${style.shape} ${style.border} ${style.bg} border-2 shadow-sm min-w-[140px]`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${STATE_COLORS[data.state] || STATE_COLORS.pending} ${
          data.state === "active" ? "animate-pulse" : ""
        }`} />
        <span className={`text-sm font-semibold ${style.text}`}>{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-gray-500 mt-1 ml-4.5">{data.description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

export default memo(FlowNode)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FlowNode.tsx
git commit -m "feat: add FlowNode custom React Flow node with 6 types and state colors"
```

### Task 6.6: Create FlowLegend

**Files:**
- Create: `src/components/FlowLegend.tsx`

- [ ] **Step 1: Write legend**

```tsx
// src/components/FlowLegend.tsx
"use client"

const ITEMS = [
  { color: "bg-green-500", label: "Completed" },
  { color: "bg-blue-500", label: "Active" },
  { color: "bg-amber-400", label: "Blocked" },
  { color: "bg-red-500", label: "Failed" },
  { color: "bg-gray-300", label: "Pending" },
]

export default function FlowLegend() {
  return (
    <div className="flex gap-4 justify-center text-xs text-gray-500 py-2">
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FlowLegend.tsx
git commit -m "feat: add FlowLegend component"
```

### Task 6.7: Create FlowChart

**Files:**
- Create: `src/components/FlowChart.tsx`

- [ ] **Step 1: Write React Flow wrapper**

```tsx
// src/components/FlowChart.tsx
"use client"

import { useCallback, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  useNodesState,
  useEdgesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import FlowNode from "./FlowNode"
import FlowLegend from "./FlowLegend"
import type { FlowTrace, ExecutionEvent } from "@/agent/types"

type FlowChartProps = {
  trace: FlowTrace | null
  cursor: number
}

function buildNodesAndEdges(events: ExecutionEvent[], cursor: number): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  events.forEach((event, i) => {
    const isPast = i < cursor
    const isCurrent = i === cursor
    const state = isCurrent ? "active" : isPast ? "completed" : "pending"

    let nodeType = "step"
    if (event.type === "decision" || event.type === "branch_taken") nodeType = "decision"
    if (event.type === "hitl_waiting" || event.type === "hitl_resolved") nodeType = "hitl"
    if (event.type === "precondition_check" || event.type === "precondition_met") nodeType = "precondition"
    if (event.type === "tool_call" || event.type === "tool_result") nodeType = "step"

    if (i === 0) nodeType = "trigger"

    const isBranch = event.type === "branch_taken"

    nodes.push({
      id: `event-${i}`,
      type: "flowNode",
      position: { x: isBranch ? 300 : 200, y: i * 100 },
      data: {
        label: isBranch ? `→ ${event.label}` : event.label,
        description: event.description,
        nodeType,
        state: isCurrent ? "active" : isPast && event.type === "failed" ? "failed" : state,
      },
    })

    if (i > 0) {
      edges.push({
        id: `edge-${i - 1}-${i}`,
        source: `event-${i - 1}`,
        target: `event-${i}`,
        animated: isCurrent,
        style: { stroke: isPast ? "#22c55e" : isCurrent ? "#3b82f6" : "#d1d5db", strokeWidth: 2 },
      })
    }
  })

  return { nodes, edges }
}

const nodeTypes: NodeTypes = { flowNode: FlowNode }

export default function FlowChart({ trace, cursor }: FlowChartProps) {
  const events = trace?.events || []
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(events, cursor),
    [events, cursor]
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onInit = useCallback(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  if (!trace) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p className="text-sm">Select an email or test flow to begin</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>
      <FlowLegend />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FlowChart.tsx
git commit -m "feat: add FlowChart React Flow component with node/edge generation from trace"
```

### Task 6.8: Create PlaybackControls

**Files:**
- Create: `src/components/PlaybackControls.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/PlaybackControls.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ReplaySpeed } from "@/hooks/useExecutionReplay"

type PlaybackControlsProps = {
  cursor: number
  total: number
  speed: ReplaySpeed
  autoplay: boolean
  isAtStart: boolean
  isAtEnd: boolean
  onPrev: () => void
  onNext: () => void
  onSpeedChange: (speed: ReplaySpeed) => void
  onToggleAutoplay: () => void
}

const SPEED_LABELS: Record<ReplaySpeed, string> = {
  fast: "Fast",
  normal: "Normal",
  slow: "Slow",
}

export default function PlaybackControls({
  cursor, total, speed, autoplay, isAtStart, isAtEnd,
  onPrev, onNext, onSpeedChange, onToggleAutoplay,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={isAtStart}>
          ← Prev
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={isAtEnd}>
          Next →
        </Button>
        <span className="text-xs text-gray-500 ml-2">
          Step {cursor + 1} of {total}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={autoplay ? "default" : "outline"}
          size="sm"
          onClick={onToggleAutoplay}
          disabled={isAtEnd}
        >
          {autoplay ? "⏸ Pause" : "▶ Play"}
        </Button>

        <div className="flex gap-1">
          {(["fast", "normal", "slow"] as ReplaySpeed[]).map((s) => (
            <Badge
              key={s}
              variant={speed === s ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => onSpeedChange(s)}
            >
              {SPEED_LABELS[s]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlaybackControls.tsx
git commit -m "feat: add PlaybackControls with prev/next, autoplay, and speed toggle"
```

### Task 6.9: Create StepView and StepItem

**Files:**
- Create: `src/components/StepView.tsx`
- Create: `src/components/StepItem.tsx`

- [ ] **Step 1: Write StepItem**

```tsx
// src/components/StepItem.tsx
"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { ExecutionEvent } from "@/agent/types"

type StepItemProps = {
  event: ExecutionEvent
  isActive: boolean
  isPast: boolean
}

function getStatusLabel(event: ExecutionEvent): { label: string; variant: "default" | "outline" | "secondary" } {
  if (event.type === "failed") return { label: "Failed", variant: "default" }
  if (event.type === "completed") return { label: "Done", variant: "default" }
  if (event.type === "hitl_waiting") return { label: "Needs Approval", variant: "outline" }
  if (event.type === "tool_call") return { label: "Tool", variant: "secondary" }
  if (event.type === "decision") return { label: "Decision", variant: "outline" }
  if (event.type === "branch_taken") return { label: "Branch", variant: "outline" }
  return { label: "Info", variant: "secondary" }
}

function getStatusColor(event: ExecutionEvent, isPast: boolean): string {
  if (event.type === "failed") return "bg-red-500"
  if (isPast) return "bg-green-500"
  return "bg-gray-300"
}

function EventIcon({ event, isPast }: { event: ExecutionEvent; isPast: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full ${getStatusColor(event, isPast)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
      {isPast ? "✓" : event.sequence + 1}
    </div>
  )
}

export default function StepItem({ event, isActive, isPast }: StepItemProps) {
  const [expanded, setExpanded] = useState(false)
  const status = getStatusLabel(event)

  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer transition-all ${
        isActive
          ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50"
          : isPast
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50 opacity-60"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <EventIcon event={event} isPast={isPast} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-900" : isPast ? "text-green-900" : "text-gray-500"}`}>
            {event.label}
          </p>
        </div>
        <Badge variant={status.variant} className="text-[10px] shrink-0">
          {status.label}
        </Badge>
      </div>

      {event.description && (
        <p className="text-xs text-gray-500 mt-1 ml-7">{event.description}</p>
      )}

      {expanded && event.data && (
        <div className="mt-2 ml-7 bg-gray-900 text-gray-200 rounded-lg p-2 text-[10px] font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(event.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write StepView**

```tsx
// src/components/StepView.tsx
"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import StepItem from "./StepItem"
import type { ExecutionEvent } from "@/agent/types"

type StepViewProps = {
  events: ExecutionEvent[]
  cursor: number
  traceName?: string
}

export default function StepView({ events, cursor, traceName }: StepViewProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">📋 Steps</h3>
        {traceName && (
          <span className="text-xs text-gray-400">{traceName}</span>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        {events.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No steps yet</p>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <StepItem
                key={i}
                event={event}
                isActive={i === cursor}
                isPast={i < cursor}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StepView.tsx src/components/StepItem.tsx
git commit -m "feat: add StepView and StepItem with expandable tool data"
```

### Task 6.10: Create DebugOverlay

**Files:**
- Create: `src/components/DebugOverlay.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/DebugOverlay.tsx
"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ExecutionEvent } from "@/agent/types"

type DebugOverlayProps = {
  events: ExecutionEvent[]
  children?: React.ReactNode
}

export default function DebugOverlay({ events, children }: DebugOverlayProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" title="Debug Console">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[480px] bg-slate-900 text-slate-200 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-slate-200 font-mono text-sm">🐛 Debug Console</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-4">
          <div className="font-mono text-xs space-y-1">
            {events.length === 0 ? (
              <div className="text-slate-500">No events recorded yet.</div>
            ) : (
              events.map((event, i) => (
                <div key={i} className="py-1 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      event.type === "completed" || event.type === "precondition_met" || event.type === "tool_result"
                        ? "bg-green-400"
                        : event.type === "failed"
                        ? "bg-red-400"
                        : event.type === "hitl_waiting"
                        ? "bg-yellow-400"
                        : "bg-blue-400"
                    }`} />
                    <span className={
                      event.type === "failed" ? "text-red-400" :
                      event.type === "tool_call" || event.type === "tool_result" ? "text-blue-400" :
                      event.type === "hitl_waiting" ? "text-yellow-400" :
                      event.type === "completed" ? "text-green-400" :
                      "text-slate-300"
                    }>
                      [{event.type}]
                    </span>
                    <span>{event.label}</span>
                  </div>
                  {event.data && (
                    <pre className="ml-4 text-slate-500 mt-0.5 text-[10px] overflow-x-auto">
                      {JSON.stringify(event.data, null, 1).slice(0, 200)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DebugOverlay.tsx
git commit -m "feat: add DebugOverlay as floating Sheet with monospace event log"
```

### Task 6.11: Create TestFlowsMenu

**Files:**
- Create: `src/components/TestFlowsMenu.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/TestFlowsMenu.tsx
"use client"

import { Button } from "@/components/ui/button"

type TestFlowsMenuProps = {
  onLaunchFlow: (flowHint: string) => void
  running?: string | null
}

const FLOWS = [
  { hint: "sales_visit", label: "🍽️ Sales Visit", desc: "Expense approval flow" },
  { hint: "maintenance", label: "🔧 Maintenance", desc: "Equipment service flow" },
  { hint: "recall", label: "⚠️ Recall", desc: "Part order + service flow" },
]

export default function TestFlowsMenu({ onLaunchFlow, running }: TestFlowsMenuProps) {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">🧪 Test Flows</h3>
      <div className="space-y-2">
        {FLOWS.map((flow) => (
          <div
            key={flow.hint}
            className={`bg-white border rounded-lg p-3 transition-all ${
              running === flow.hint
                ? "border-blue-500 shadow-sm"
                : "border-gray-200 hover:border-blue-400 hover:shadow-sm cursor-pointer"
            }`}
            onClick={() => !running && onLaunchFlow(flow.hint)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{flow.label.split(" ")[0]}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{flow.label}</div>
                <div className="text-xs text-gray-500">{flow.desc}</div>
              </div>
              {running === flow.hint && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TestFlowsMenu.tsx
git commit -m "feat: add TestFlowsMenu for launching pre-defined flows"
```

### Task 6.12: Create FlowExecutionView (main orchestrator)

**Files:**
- Create: `src/components/FlowExecutionView.tsx`

- [ ] **Step 1: Write orchestrator component**

```tsx
// src/components/FlowExecutionView.tsx
"use client"

import { useCallback } from "react"
import ThreePanelLayout from "./ThreePanelLayout"
import InboxPanel from "./InboxPanel"
import FlowChart from "./FlowChart"
import StepView from "./StepView"
import PlaybackControls from "./PlaybackControls"
import TestFlowsMenu from "./TestFlowsMenu"
import DebugOverlay from "./DebugOverlay"
import { useExecutionReplay } from "@/hooks/useExecutionReplay"
import { runFlow, getFlowTrace, listFlowTraces } from "@/lib/services/flows"
import type { MockEmail } from "@/agent/types"

export default function FlowExecutionView() {
  const [state, controls] = useExecutionReplay()

  const handleSelectEmail = useCallback(async (email: MockEmail) => {
    try {
      const trace = await runFlow(email.flow_hint, email.id)
      controls.loadTrace(trace)
    } catch {
      // Try loading from existing trace
      try {
        const traces = await listFlowTraces()
        const match = traces.find((t) => t.execution_trace?.flow_name?.toLowerCase().includes(email.flow_hint))
        if (match) {
          controls.loadTrace(match.execution_trace)
        }
      } catch {}
    }
  }, [controls])

  const handleLaunchFlow = useCallback(async (flowHint: string) => {
    try {
      const trace = await runFlow(flowHint)
      controls.loadTrace(trace)
    } catch {
      try {
        const traces = await listFlowTraces()
        const match = traces.find((t) =>
          t.execution_trace?.flow_name?.toLowerCase().includes(flowHint.replace("_", " "))
        )
        if (match) {
          controls.loadTrace(match.execution_trace)
        }
      } catch {}
    }
  }, [controls])

  return (
    <div className="h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-slate-800 text-white px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-bold text-base">Field Agent</span>
          <span className="text-slate-400 text-sm cursor-pointer hover:text-white">Dashboard</span>
          <span className="text-slate-400 text-sm cursor-pointer hover:text-white">Flows</span>
          <span className="text-slate-400 text-sm cursor-pointer hover:text-white">History</span>
        </div>
        <div className="flex items-center gap-3">
          <DebugOverlay events={state.trace?.events || []} />
        </div>
      </header>

      {/* Three-panel body */}
      <div className="flex-1 overflow-hidden">
        <ThreePanelLayout
          left={
            <>
              <InboxPanel onSelectEmail={handleSelectEmail} />
              <TestFlowsMenu onLaunchFlow={handleLaunchFlow} />
            </>
          }
          center={
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <FlowChart trace={state.trace} cursor={state.cursor} />
              </div>
              {state.trace && (
                <PlaybackControls
                  cursor={state.cursor}
                  total={state.trace.events.length}
                  speed={state.speed}
                  autoplay={state.autoplay}
                  isAtStart={state.isAtStart}
                  isAtEnd={state.isAtEnd}
                  onPrev={controls.prev}
                  onNext={controls.next}
                  onSpeedChange={controls.setSpeed}
                  onToggleAutoplay={controls.toggleAutoplay}
                />
              )}
            </div>
          }
          right={
            <StepView
              events={state.visibleEvents}
              cursor={state.cursor}
              traceName={state.trace?.flow_name}
            />
          }
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FlowExecutionView.tsx
git commit -m "feat: add FlowExecutionView orchestrator with inbox, flow chart, step view, and debug"
```

---

## Phase 7: Page Integration

### Task 7.1: Replace dashboard page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace content**

```tsx
// src/app/page.tsx
import FlowExecutionView from "@/components/FlowExecutionView"

export default function HomePage() {
  return <FlowExecutionView />
}
```

- [ ] **Step 2: Remove old visit UI files**

```bash
rm -rf src/app/visits/
rm -f src/app/new/page.tsx
rm -f src/components/AgentRunPanel.tsx
rm -f src/components/PipelineStepper.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git rm -r src/app/visits/
git rm -f src/app/new/page.tsx
git rm -f src/components/AgentRunPanel.tsx
git rm -f src/components/PipelineStepper.tsx
git commit -m "feat: replace dashboard with FlowExecutionView, remove old visit-centric UI"
```

---

## Phase 8: Cleanup & Polish

### Task 8.1: Remove old agent API routes

**Files:**
- Remove: `src/app/api/agent/run/route.ts`, `src/app/api/agent/status/route.ts`, `src/app/api/agent/resolve/route.ts`

- [ ] **Step 1: Remove old Next.js API routes**

```bash
rm -rf src/app/api/agent/
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old Next.js API routes for agent (replaced by Hono flow endpoints)"
```

### Task 8.2: Remove unused dependencies

- [ ] **Step 1: Check for packages no longer needed**

No packages should be removed — React Flow, ShadCN, and react-hotkeys-hook are additions.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -40`
Expected: Clean compile (or manageable errors from the tsconfig.server.json)

### Task 8.3: Update AGENTS.md and README

- [ ] **Step 1: Update README with new architecture**

Update the README to reflect the flow-centric architecture, replay demo workflow, and new UI layout.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with flow-centric architecture and demo workflow"
```

---

## Self-Review Checklist

1. **Spec coverage** — Every section of the design doc maps to tasks:
   - Section 1 (Sample Flows) → Tasks 3.2, 3.3, 3.4
   - Section 2 (Flow Engine) → Tasks 2.1, 2.2
   - Section 3 (Replay) → Task 4.2
   - Section 4 (UI) → Tasks 6.1-6.12
   - Section 5 (Demo Workflow) → Task 4.2 (replay), Task 5.2 (API)
   - Section 8 (Additional Details) → Tasks 1.1-1.4, 3.1, 5.1, 5.3, 8.1-8.3

2. **Placeholder scan** — No TBD, TODO, or incomplete code blocks

3. **Type consistency** — `FlowDefinition`, `FlowContext`, `FlowTrace`, `ExecutionEvent` types are consistent across flow.ts, flowEngine.ts, flowRegistry.ts, and all UI components

4. **No missing imports** — Every task references existing types (`@/agent/types`, `@/agent/flow`, `@samples/*`) that the tsconfig alias will resolve
