import { describe, it, expect, vi } from "vitest"

vi.mock("@/data/db", () => ({
  query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
    if (sql.includes("SELECT * FROM visits ORDER BY")) {
      return Promise.resolve([
        { id: "v1", account_name: "Acme Dental", account_industry: "dental", subject: "Demo", notes: "Met with Dr. Smith", outcomes: "Positive", owner_alias: "jdoe", created_at: "2025-01-01T00:00:00Z" },
        { id: "v2", account_name: "Greenfield HVAC", account_industry: "hvac", subject: "Contract review", notes: "Renewal discussion", outcomes: "Pending", owner_alias: "asmith", created_at: "2025-01-02T00:00:00Z" },
      ])
    }
    if (sql.includes("WHERE id = $1") && !sql.includes("visit_id")) {
      return Promise.resolve([{ id: params?.[0] || "v1", account_name: "Test Account", account_industry: "test", subject: "Test", notes: "Notes", outcomes: "Done", owner_alias: "tester", created_at: "2025-01-01T00:00:00Z" }])
    }
    if (sql.includes("WHERE visit_id = $1")) {
      return Promise.resolve([])
    }
    if (sql.includes("INSERT INTO agent_runs")) {
      return Promise.resolve([{ id: "run-1", visit_id: params?.[0], status: "running", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
    }
    if (sql.includes("INSERT INTO agent_tasks")) {
      return Promise.resolve([{ id: "task-1", run_id: params?.[0], type: params?.[1], title: params?.[2] || "Task", state: params?.[4] || "pending_human", created_at: new Date().toISOString() }])
    }
    return Promise.resolve([])
  }),
}))

vi.mock("@/agent/client", () => ({
  sendMessage: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: `<result>{"extracted":[{"type":"action","description":"Send follow-up email","classification":"human"}],"summary":"Send follow-up"}</result>` }],
  }),
}))

import { GET as listVisits } from "@/app/api/visits/route"

describe("API: GET /api/visits", () => {
  it("returns visit list", async () => {
    const response = await listVisits()
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty("account_name")
  })
})
