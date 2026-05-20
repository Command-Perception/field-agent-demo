import { Hono } from "hono"
import { cors } from "hono/cors"
import * as queries from "../data/queries"
import { query } from "../data/db"
import { runAgent, resolveHITL } from "../agent/core"
import { v4 as uuid } from "uuid"

const api = new Hono()

api.use("*", cors())

api.get("/api/visits", async (c) => {
  try {
    const visits = await queries.listVisitsWithLatestRun()
    return c.json(visits)
  } catch {
    return c.json({ error: "Failed to fetch visits" }, 500)
  }
})

api.post("/api/visits", async (c) => {
  try {
    const body = await c.req.json()
    const { account_name, account_industry, subject, notes, outcomes, owner_alias } = body
    if (!account_name || !subject) {
      return c.json({ error: "account_name and subject are required" }, 400)
    }
    const rows = await query(
      `INSERT INTO visits (id, account_name, account_industry, subject, notes, outcomes, owner_alias)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [uuid(), account_name, account_industry || null, subject, notes || null, outcomes || null, owner_alias || null]
    )
    return c.json(rows[0], 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to create visit" }, 500)
  }
})

api.get("/api/visits/:id", async (c) => {
  try {
    const id = c.req.param("id")
    const visit = await queries.getVisitWithRuns(id)
    if (!visit) return c.json({ error: "Visit not found" }, 404)
    return c.json(visit)
  } catch {
    return c.json({ error: "Failed to fetch visit" }, 500)
  }
})

api.post("/api/agent/run", async (c) => {
  try {
    const body = await c.req.json()
    const { visitId } = body
    if (!visitId) return c.json({ error: "visitId required" }, 400)
    const result = await runAgent(visitId)
    return c.json(result, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Agent run failed" }, 500)
  }
})

api.get("/api/agent/status", async (c) => {
  try {
    const visitId = c.req.query("visitId")
    if (!visitId) return c.json({ error: "visitId query param required" }, 400)
    const visit = await queries.getVisitWithRuns(visitId)
    if (!visit) return c.json({ error: "Visit not found" }, 404)
    return c.json(visit)
  } catch {
    return c.json({ error: "Failed to get status" }, 500)
  }
})

api.post("/api/reset", async (c) => {
  try {
    await query("TRUNCATE visits, agent_runs, agent_tasks, artifacts, mock_emails RESTART IDENTITY CASCADE")
    const { seed } = await import("../data/seed")
    await seed()
    const { seedEmails } = await import("../../.ai/samples/seed-emails")
    await seedEmails()
    return c.json({ message: "Database reset and reseeded" })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Reset failed" }, 500)
  }
})

api.post("/api/seed", async (c) => {
  try {
    const { seed } = await import("../data/seed")
    await seed()
    return c.json({ message: "Seeded 5 visits" })
  } catch (err) {
    return c.json({ error: "Seed failed" }, 500)
  }
})

api.post("/api/agent/resolve", async (c) => {
  try {
    const body = await c.req.json()
    const { runId, taskId, approved, feedback } = body
    if (!runId || !taskId || approved === undefined) {
      return c.json({ error: "runId, taskId, and approved required" }, 400)
    }
    const result = await resolveHITL(runId, taskId, approved, feedback)
    return c.json(result)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Resolution failed" }, 500)
  }
})

export { api }
