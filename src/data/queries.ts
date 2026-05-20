import { query } from "./db"

export async function listVisits() {
  return query("SELECT * FROM visits ORDER BY created_at DESC")
}

export async function listVisitsWithLatestRun() {
  const rows = await query(`
    SELECT v.*, ar.status as latest_run_status, ar.id as latest_run_id
    FROM visits v
    LEFT JOIN LATERAL (
      SELECT id, status FROM agent_runs
      WHERE visit_id = v.id
      ORDER BY created_at DESC
      LIMIT 1
    ) ar ON true
    ORDER BY v.created_at DESC
  `)
  return rows.map((r: any) => ({
    id: r.id,
    account_name: r.account_name,
    account_industry: r.account_industry,
    subject: r.subject,
    notes: r.notes,
    outcomes: r.outcomes,
    owner_alias: r.owner_alias,
    created_at: r.created_at,
    latest_run_status: r.latest_run_status || null,
  }))
}

export async function getVisit(id: string) {
  const rows = await query("SELECT * FROM visits WHERE id = $1", [id])
  return rows[0] || null
}

export async function getVisitWithRuns(visitId: string) {
  const visit = await getVisit(visitId)
  if (!visit) return null
  const runs = await query(
    "SELECT * FROM agent_runs WHERE visit_id = $1 ORDER BY created_at DESC",
    [visitId]
  )
  const runIds = runs.map((r: any) => r.id)
  let tasks: any[] = []
  let artifacts: any[] = []
  if (runIds.length > 0) {
    tasks = await query(
      "SELECT * FROM agent_tasks WHERE run_id = ANY($1::uuid[]) ORDER BY created_at",
      [runIds]
    )
    artifacts = await query(
      "SELECT * FROM artifacts WHERE run_id = ANY($1::uuid[]) ORDER BY created_at",
      [runIds]
    )
  }
  return {
    ...visit,
    runs: runs.map((r: any) => ({
      ...r,
      tasks: tasks.filter((t: any) => t.run_id === r.id),
      artifacts: artifacts.filter((a: any) => a.run_id === r.id),
    })),
  }
}

export async function createRun(visitId: string) {
  const rows = await query(
    "INSERT INTO agent_runs (visit_id, status) VALUES ($1, 'running') RETURNING *",
    [visitId]
  )
  return rows[0]
}

export async function updateRunStatus(runId: string, status: string) {
  await query(
    "UPDATE agent_runs SET status = $1, updated_at = NOW() WHERE id = $2",
    [status, runId]
  )
}

export async function addTask(
  runId: string,
  task: {
    type: string
    title: string
    description?: string
    state: string
    details?: any
  }
) {
  const rows = await query(
    "INSERT INTO agent_tasks (run_id, type, title, description, state, details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      runId,
      task.type,
      task.title,
      task.description || "",
      task.state,
      task.details ? JSON.stringify(task.details) : null,
    ]
  )
  return rows[0]
}

export async function updateTaskState(
  runId: string,
  taskId: string,
  state: string,
  result?: any
) {
  await query(
    "UPDATE agent_tasks SET state = $1, result = COALESCE($2::jsonb, result), updated_at = NOW() WHERE id = $3 AND run_id = $4",
    [state, result ? JSON.stringify(result) : null, taskId, runId]
  )
}

export async function getReadyAgentTasks(runId: string) {
  return query(
    "SELECT * FROM agent_tasks WHERE run_id = $1 AND type = 'agent' AND state = 'ready_to_run' ORDER BY created_at",
    [runId]
  )
}

export async function getRun(runId: string) {
  const rows = await query("SELECT * FROM agent_runs WHERE id = $1", [runId])
  return rows[0] || null
}

export async function addArtifact(
  runId: string,
  artifact: { type: string; title: string; content?: string }
) {
  const existing = await query(
    "SELECT COUNT(*) as c FROM artifacts WHERE run_id = $1 AND type = $2",
    [runId, artifact.type]
  )
  const version = parseInt(existing[0]?.c || "0", 10) + 1
  const rows = await query(
    "INSERT INTO artifacts (run_id, type, title, content, version) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [runId, artifact.type, artifact.title, artifact.content || "", version]
  )
  return rows[0]
}

export async function listMockEmails() {
  return query("SELECT * FROM mock_emails ORDER BY created_at DESC")
}

export async function getMockEmail(id: string) {
  const rows = await query("SELECT * FROM mock_emails WHERE id = $1", [id])
  return rows[0] || null
}

export async function markEmailRead(id: string) {
  await query("UPDATE mock_emails SET is_read = true WHERE id = $1", [id])
}

export async function listFlowTraces() {
  return query(
    `SELECT id, visit_id, status, summary, execution_trace, created_at, updated_at
     FROM agent_runs
     WHERE execution_trace IS NOT NULL
     ORDER BY created_at DESC`
  )
}

export async function getFlowTrace(runId: string) {
  const rows = await query(
    `SELECT id, visit_id, status, summary, execution_trace, created_at, updated_at
     FROM agent_runs WHERE id = $1 AND execution_trace IS NOT NULL`,
    [runId]
  )
  return rows[0] || null
}

export async function saveFlowTrace(runId: string, trace: Record<string, unknown>) {
  await query(
    `UPDATE agent_runs SET execution_trace = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(trace), runId]
  )
}
