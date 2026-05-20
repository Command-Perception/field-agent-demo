import type { ExecutionEvent, FlowInput } from "./types"

export type ToolHandler = (input: Record<string, unknown>, runId: string) => Promise<Record<string, unknown>>

export abstract class FlowDefinition {
  abstract name: string
  abstract description: string
  abstract execute(ctx: FlowContext): Promise<void>
}

type FlowHITLResponse = { approved: boolean; feedback?: string }

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
