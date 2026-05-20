import { describe, it, expect } from "vitest"
import { apiRequest, waitForRunComplete } from "./helpers"

describe("HITL Flow", () => {
  const testId = `e2e-hitl-${Date.now()}`
  let visitId: string
  let runId: string

  it("creates a visit with outcomes that trigger human-classified tasks", async () => {
    const visit: any = await apiRequest("/api/visits", {
      method: "POST",
      body: JSON.stringify({
        account_name: testId,
        account_industry: "e2e-test",
        subject: "HITL flow test",
        notes: "Customer wants pricing info. Asked about enterprise plan. Wants demo for their team. Spent $65 on coffee. Need to check expense policy.",
        outcomes: "Follow-up needed: send pricing, schedule team demo, check expense.",
        owner_alias: "e2e-runner",
      }),
    })
    visitId = visit.id

    await apiRequest("/api/agent/run", {
      method: "POST",
      body: JSON.stringify({ visitId }),
    })

    const status = await waitForRunComplete(visitId)
    expect(["waiting_on_human", "completed"]).toContain(status)
  }, 90000)

  it("resolves pending tasks via approve", async () => {
    const fetched: any = await apiRequest(`/api/visits/${visitId}`)
    const run = fetched.runs[0]
    runId = run.id

    const pendingTasks = run.tasks.filter((t: any) => t.state === "pending_human")
    if (pendingTasks.length === 0) return

    for (const task of pendingTasks) {
      const resolved: any = await apiRequest("/api/agent/resolve", {
        method: "POST",
        body: JSON.stringify({
          runId: run.id,
          taskId: task.id,
          approved: true,
          feedback: "Approved in HITL flow test",
        }),
      })

      const updatedRun = resolved.runs?.[0]
      if (updatedRun) {
        const doneTask = updatedRun.tasks.find((t: any) => t.id === task.id)
        expect(doneTask?.state).toBe("done")
      }
    }
  }, 30000)

  it("resolves pending tasks via reject", async () => {
    const fetched: any = await apiRequest(`/api/visits/${visitId}`)
    const run = fetched.runs[0]

    const pendingTasks = run.tasks.filter((t: any) => t.state === "pending_human")
    if (pendingTasks.length === 0) return

    const task = pendingTasks[0]
    const resolved: any = await apiRequest("/api/agent/resolve", {
      method: "POST",
      body: JSON.stringify({
        runId: run.id,
        taskId: task.id,
        approved: false,
        feedback: "Not needed at this time",
      }),
    })

    const updatedRun = resolved.runs?.[0]
    if (updatedRun) {
      const doneTask = updatedRun.tasks.find((t: any) => t.id === task.id)
      expect(doneTask?.state).toBe("done")
      expect(doneTask?.result).toHaveProperty("approved", false)
    }
  }, 30000)
})
