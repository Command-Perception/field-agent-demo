import { apiRequest } from "../client"

export type Visit = {
  id: string
  account_name: string
  account_industry?: string
  subject: string
  notes?: string
  outcomes?: string
  owner_alias?: string
  created_at?: string
  latest_run_status?: string | null
}

export type VisitWithRuns = Visit & {
  runs?: Array<{
    id: string
    status: string
    summary?: string
    created_at: string
    updated_at: string
    tasks?: Array<{
      id: string
      run_id: string
      type: string
      title: string
      description?: string
      state: string
      result?: Record<string, unknown>
    }>
    artifacts?: Array<{
      id: string
      type: string
      title: string
      content?: string
      version: number
      created_at: string
    }>
  }>
}

export type CreateVisitInput = {
  account_name: string
  account_industry?: string
  subject: string
  notes?: string
  outcomes?: string
  owner_alias?: string
}

export async function listVisits(): Promise<Visit[]> {
  return apiRequest<Visit[]>("/api/visits")
}

export async function getVisit(id: string): Promise<VisitWithRuns> {
  return apiRequest<VisitWithRuns>(`/api/visits/${id}`)
}

export async function createVisit(data: CreateVisitInput): Promise<Visit> {
  return apiRequest<Visit>("/api/visits", {
    method: "POST",
    body: JSON.stringify(data),
  })
}
