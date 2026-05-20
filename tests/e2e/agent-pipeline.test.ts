import { describe, it, expect } from "vitest"
import { apiRequest, connectWs, waitForWsEvent, waitForRunComplete } from "./helpers"

describe("Agent Pipeline", () => {
  const testId = `e2e-pipeline-${Date.now()}`
  let visitId: string

  it("runs the full agent pipeline with correct WebSocket events", async () => {
    const visit: any = await apiRequest("/api/visits", {
      method: "POST",
      body: JSON.stringify({
        account_name: testId,
        account_industry: "e2e-test",
        subject: "E2E agent pipeline test",
        notes: "Met with VP of Engineering. They want to evaluate our platform. Interested in enterprise tier pricing. Concerned about data residency. Competitor offering EU hosting. Need to prepare proposal.",
        outcomes: "Interest confirmed. Data residency is blocking. Need pricing proposal.",
        owner_alias: "e2e-runner",
      }),
    })
    visitId = visit.id

    const ws = await connectWs()

    const result = apiRequest("/api/agent/run", {
      method: "POST",
      body: JSON.stringify({ visitId }),
    })

    const phaseEvent = await waitForWsEvent(ws, "phase", 15000)
    expect(phaseEvent).toHaveProperty("runId")
    expect(phaseEvent).toHaveProperty("phase")
    expect(phaseEvent).toHaveProperty("status")

    const status = await waitForRunComplete(visitId)
    expect(["completed", "waiting_on_human", "failed"]).toContain(status)

    const fetched: any = await apiRequest(`/api/visits/${visitId}`)
    expect(fetched.runs.length).toBeGreaterThan(0)

    const run = fetched.runs[0]
    expect(run.status).toBe(status)
    expect(run.tasks.length).toBeGreaterThan(0)

    const analysisArtifact = run.artifacts?.find((a: any) => a.type === "analysis")
    expect(analysisArtifact).toBeTruthy()
    expect(analysisArtifact.title).toContain("Visit analysis")

    if (status === "waiting_on_human") {
      const pendingTasks = run.tasks.filter((t: any) => t.state === "pending_human")
      expect(pendingTasks.length).toBeGreaterThan(0)

      const approvalTask = pendingTasks[0]
      const resolved: any = await apiRequest("/api/agent/resolve", {
        method: "POST",
        body: JSON.stringify({
          runId: run.id,
          taskId: approvalTask.id,
          approved: true,
          feedback: "Approved via E2E test",
        }),
      })

      if (resolved.runs?.[0]) {
        const updatedRun = resolved.runs[0]
        const resolvedTask = updatedRun.tasks.find((t: any) => t.id === approvalTask.id)
        expect(resolvedTask?.state).toBe("done")
        expect(resolvedTask?.result).toHaveProperty("approved", true)
      }
    }

    ws.close()
  }, 120000)
})
