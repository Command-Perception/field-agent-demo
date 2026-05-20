import { serve } from "@hono/node-server"
import type { Server } from "http"
import { api } from "./hono"
import { initWebSocketServer } from "./wsManager"
import { query, initializePool } from "../data/db"

async function waitForDb(maxRetries = 10, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      initializePool()
      await query("SELECT 1")
      return
    } catch {
      if (i < maxRetries - 1) {
        console.log(`Waiting for database (attempt ${i + 1}/${maxRetries})...`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw new Error("Database not available after retries")
}

async function migrate() {
  await query(`CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_industry TEXT,
    subject TEXT NOT NULL,
    notes TEXT,
    outcomes TEXT,
    owner_alias TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await query(`CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running',
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await query(`CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL DEFAULT 'pending_human',
    details JSONB,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await query(`CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await query("CREATE INDEX IF NOT EXISTS idx_agent_runs_visit_id ON agent_runs(visit_id)")
  await query("CREATE INDEX IF NOT EXISTS idx_agent_tasks_run_id ON agent_tasks(run_id)")
  await query("CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id)")
  console.log("Migrations complete")
}

const PORT = parseInt(process.env.PORT || "3999", 10)

waitForDb().then(() => migrate()).then(() => {
  const server = serve({
    fetch: api.fetch,
    port: PORT,
  })
  initWebSocketServer(server as unknown as Server)
  console.log(`API server running on http://0.0.0.0:${PORT}`)
  console.log(`WebSocket available at ws://0.0.0.0:${PORT}/ws`)
}).catch((err) => {
  console.error("Startup failed:", err)
  process.exit(1)
})
