export type VisitContext = {
  id: string
  account_name: string
  account_industry?: string
  subject: string
  notes?: string
  outcomes?: string
  owner_alias?: string
  created_at?: string
}

export type ExtractedItem = {
  type: "question" | "commitment" | "risk" | "action" | "date"
  description: string
  classification: "agent" | "human" | "approval"
}

export type ExtractionResult = {
  extracted: ExtractedItem[]
  summary: string
}

export type AgentRun = {
  id: string
  visit_id: string
  status: "running" | "waiting_on_human" | "completed" | "failed"
  summary?: string
  created_at: string
  updated_at: string
}

export type AgentTask = {
  id: string
  run_id: string
  type: "agent" | "human" | "approval"
  title: string
  description?: string
  state: "pending_human" | "ready_to_run" | "blocked" | "done"
  details?: Record<string, unknown>
  result?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Artifact = {
  id: string
  run_id: string
  type: "analysis" | "email_draft" | "research" | "proposal" | "expense_check" | "note"
  title: string
  content?: string
  version: number
  created_at: string
}

export type ResolveRequest = {
  runId: string
  taskId: string
  approved: boolean
  feedback?: string
}
