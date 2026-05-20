import { describe, it, expect } from "vitest"
import { apiRequest } from "./helpers"

describe("Create Visit", () => {
  const testId = `e2e-create-${Date.now()}`

  it("creates a visit via POST /api/visits", async () => {
    const visit: any = await apiRequest("/api/visits", {
      method: "POST",
      body: JSON.stringify({
        account_name: testId,
        account_industry: "e2e-test",
        subject: "E2E test visit",
        notes: "Testing the agent pipeline end-to-end.",
        outcomes: "Verify everything works.",
        owner_alias: "e2e-runner",
      }),
    })

    expect(visit).toHaveProperty("id")
    expect(visit.account_name).toBe(testId)
    expect(visit.account_industry).toBe("e2e-test")
    expect(visit.subject).toBe("E2E test visit")
    expect(visit).toHaveProperty("created_at")
  })

  it("fetches the created visit via GET /api/visits/:id", async () => {
    const created: any = await apiRequest("/api/visits", {
      method: "POST",
      body: JSON.stringify({
        account_name: `${testId}-fetch`,
        subject: "Fetch test",
      }),
    })

    const fetched: any = await apiRequest(`/api/visits/${created.id}`)
    expect(fetched.id).toBe(created.id)
    expect(fetched.account_name).toBe(`${testId}-fetch`)
    expect(fetched).toHaveProperty("runs")
    expect(Array.isArray(fetched.runs)).toBe(true)
  })

  it("lists all visits via GET /api/visits", async () => {
    const visits: any = await apiRequest("/api/visits")
    expect(Array.isArray(visits)).toBe(true)
    expect(visits.length).toBeGreaterThan(0)
    expect(visits[0]).toHaveProperty("account_name")
    expect(visits[0]).toHaveProperty("latest_run_status")
  })

  it("rejects visits without required fields", async () => {
    await expect(
      apiRequest("/api/visits", {
        method: "POST",
        body: JSON.stringify({}),
      })
    ).rejects.toThrow()
  })
})
