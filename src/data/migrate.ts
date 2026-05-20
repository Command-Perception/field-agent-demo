import { query } from "./db"

async function migrate() {
  console.log("Running migrations...")

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
  console.log("  Created visits table")

  await query(`CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running',
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  console.log("  Created agent_runs table")

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
  console.log("  Created agent_tasks table")

  await query(`CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  console.log("  Created artifacts table")

  await query("CREATE INDEX IF NOT EXISTS idx_agent_runs_visit_id ON agent_runs(visit_id)")
  console.log("  Created index on agent_runs(visit_id)")

  await query("CREATE INDEX IF NOT EXISTS idx_agent_tasks_run_id ON agent_tasks(run_id)")
  console.log("  Created index on agent_tasks(run_id)")

  await query("CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id)")
  console.log("  Created index on artifacts(run_id)")

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

  console.log("Migrations complete.")
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
