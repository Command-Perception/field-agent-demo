import "./db"
import { query } from "./db"

export async function initDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS visits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_name TEXT NOT NULL, account_industry TEXT, subject TEXT NOT NULL, notes TEXT, outcomes TEXT, owner_alias TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS agent_runs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), visit_id UUID REFERENCES visits(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'running', summary TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS agent_tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, state TEXT NOT NULL DEFAULT 'pending_human', details JSONB, result JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS artifacts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, content TEXT, version INT DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`,
  ]
  for (const sql of tables) {
    await query(sql)
  }

  await query("CREATE INDEX IF NOT EXISTS idx_agent_runs_visit_id ON agent_runs(visit_id)")
  await query("CREATE INDEX IF NOT EXISTS idx_agent_tasks_run_id ON agent_tasks(run_id)")
  await query("CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id)")

  const existing = await query("SELECT COUNT(*) as c FROM visits")
  if (parseInt(existing[0]?.c || "0", 10) === 0) {
    const visits = [
      { account_name: "Acme Dental Supply", account_industry: "dental", subject: "Q1 product demo and contract renewal", notes: "Met with Dr. Smith. Interested in imaging software but concerned about pricing. Competitor MediTech offered discount. Wants proposal by next Friday. Spent $47 on coffee.", outcomes: "Positive - interested in upgrade path. Risk: competitor pricing pressure.", owner_alias: "jdoe" },
      { account_name: "Greenfield HVAC", account_industry: "hvac", subject: "Seasonal maintenance contract review", notes: "Met with facility manager Johnson. Approved renewal but wants 5% discount for 3-year commit. 12 units serviced. One compressor showing wear - needs quote. Asked about smart thermostat integration.", outcomes: "Renewal approved pending discount negotiation. Follow-up: compressor quote.", owner_alias: "asmith" },
      { account_name: "CloudScale Software", account_industry: "software", subject: "Onboarding session for new ERP modules", notes: "3-hour session with CTO and team. Implemented successfully. Found 2 data migration issues needing vendor support tickets. Team wants follow-up training in 2 weeks. Expensed $120 for team lunch.", outcomes: "Successful onboarding. 2 support tickets needed. Training scheduled.", owner_alias: "jdoe" },
      { account_name: "NovaMed Research", account_industry: "medical", subject: "Quarterly business review", notes: "Mixed meeting. Purchasing director happy with service. Lab manager frustrated with late deliveries. CFO requesting cost analysis for bulk reagent contract. Competitor BioSync offering volume pricing.", outcomes: "Service issues to address. Cost analysis requested. Competitive threat identified.", owner_alias: "bwilson" },
      { account_name: "Brickstone Consulting", account_industry: "consulting", subject: "Partnership expansion negotiation", notes: "Preliminary talks about expanding from 3 to 8 markets. CEO enthusiastic but wants phased approach. Legal needs to review IP sharing terms. Need sample SOW by end of month. Expensed $230 for client dinner.", outcomes: "Interested in expansion. Legal review pending. SOW due EOM.", owner_alias: "asmith" },
    ]
    for (const v of visits) {
      await query(
        "INSERT INTO visits (account_name, account_industry, subject, notes, outcomes, owner_alias) VALUES ($1,$2,$3,$4,$5,$6)",
        [v.account_name, v.account_industry, v.subject, v.notes, v.outcomes, v.owner_alias]
      )
    }
  }
}
