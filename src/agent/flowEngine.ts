import type { FlowDefinition } from "./flow"
import { FlowContext, EventRecorder } from "./flow"
import type { FlowInput, FlowTrace, FlowHITLResponse } from "./types"
import { query } from "../data/db"
import { v4 as uuid } from "uuid"
import toolHandlers from "./toolHandlers"

const pendingHITL = new Map<string, { resolve: (r: FlowHITLResponse) => void }>()

function registerDefaultTools(ctx: FlowContext) {
  for (const [name, handler] of Object.entries(toolHandlers)) {
    ctx.tools.register(name, handler as any)
  }
}

export async function runFlow(flow: FlowDefinition, input: FlowInput): Promise<FlowTrace> {
  const runId = uuid()
  const recorder = new EventRecorder()

  await query(
    `INSERT INTO agent_runs (id, status, summary) VALUES ($1, $2, $3)`,
    [runId, "running", flow.name]
  )

  const ctx = new FlowContext(input, recorder)
  registerDefaultTools(ctx)

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

  await query(
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
