import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/data/db", () => ({
  query: vi.fn().mockResolvedValue([{ id: "1", account_name: "Test" }]),
}))

import * as queries from "@/data/queries"
import { query } from "@/data/db"

describe("Database queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("listVisits returns all visits", async () => {
    const result = await queries.listVisits()
    expect(result).toHaveLength(1)
    expect(query).toHaveBeenCalledWith("SELECT * FROM visits ORDER BY created_at DESC")
  })

  it("createRun inserts and returns new run", async () => {
    ;(query as any).mockResolvedValueOnce([{ id: "run-1", visit_id: "v1", status: "running" }])
    const result = await queries.createRun("v1")
    expect(result.id).toBe("run-1")
    expect(result.status).toBe("running")
  })

  it("getVisitWithRuns returns nested structure", async () => {
    ;(query as any)
      .mockResolvedValueOnce([{ id: "v1", account_name: "Test" }])

    const result = await queries.getVisitWithRuns("v1")
    expect(result).toBeTruthy()
  })

  it("getReadyAgentTasks filters by type and state", async () => {
    ;(query as any).mockResolvedValueOnce([
      { id: "t1", run_id: "r1", type: "agent", state: "ready_to_run" },
    ])
    const result = await queries.getReadyAgentTasks("r1")
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("agent")
    expect(result[0].state).toBe("ready_to_run")
  })
})
