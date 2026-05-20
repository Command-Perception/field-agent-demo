import { apiRequest } from "../client"
import type { VisitWithRuns } from "./visits"

export type ResolveHITLInput = {
  runId: string
  taskId: string
  approved: boolean
  feedback?: string
}

export async function runAgent(visitId: string): Promise<VisitWithRuns> {
  return apiRequest<VisitWithRuns>("/api/agent/run", {
    method: "POST",
    body: JSON.stringify({ visitId }),
  })
}

export async function getAgentStatus(visitId: string): Promise<VisitWithRuns> {
  return apiRequest<VisitWithRuns>(`/api/agent/status?visitId=${visitId}`)
}

export async function resolveHITL(input: ResolveHITLInput): Promise<VisitWithRuns> {
  return apiRequest<VisitWithRuns>("/api/agent/resolve", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
