import { apiRequest } from "../client"
import type { FlowTrace, MockEmail } from "@/agent/types"

export type FlowTraceRecord = {
  id: string
  flow_name: string
  execution_trace: FlowTrace
  status: string
  created_at: string
}

export async function listFlowTraces(): Promise<FlowTraceRecord[]> {
  return apiRequest<FlowTraceRecord[]>("/api/flows/traces")
}

export async function getFlowTrace(id: string): Promise<FlowTraceRecord> {
  return apiRequest<FlowTraceRecord>(`/api/flows/traces/${id}`)
}

export async function runFlow(flowHint: string, emailId?: string): Promise<FlowTrace> {
  return apiRequest<FlowTrace>("/api/flow/run", {
    method: "POST",
    body: JSON.stringify({ flowHint, emailId }),
  })
}

export async function resolveHITL(
  runId: string, label: string, approved: boolean, feedback?: string
): Promise<{ resolved: boolean }> {
  return apiRequest("/api/flow/resolve-hitl", {
    method: "POST",
    body: JSON.stringify({ runId, label, approved, feedback }),
  })
}

export async function listEmails(): Promise<MockEmail[]> {
  return apiRequest<MockEmail[]>("/api/emails")
}
