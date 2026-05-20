"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import AgentRunPanel from "@/components/AgentRunPanel"

type Visit = {
  id: string
  account_name: string
  account_industry?: string
  subject: string
  notes?: string
  outcomes?: string
  owner_alias?: string
  created_at?: string
  runs?: any[]
}

export default function VisitDetailPage() {
  const params = useParams()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchVisit = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits/${params.id}`)
      if (res.ok) setVisit(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchVisit()
  }, [fetchVisit])

  async function handleRunAgent() {
    setRunning(true)
    try {
      await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: params.id }),
      })
      await fetchVisit()
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Visit not found.</p>
      </div>
    )
  }

  const latestRun = visit.runs && visit.runs.length > 0
    ? [...visit.runs].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <a href="/" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</a>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{visit.account_name}</h1>
          </div>
          <button
            onClick={handleRunAgent}
            disabled={running}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {running ? "Running…" : "Run Agent"}
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Visit Context</h2>
              <div>
                <p className="text-xs text-gray-400 uppercase">Account</p>
                <p className="text-sm font-semibold text-gray-900">{visit.account_name}</p>
              </div>
              {visit.account_industry && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Industry</p>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                    {visit.account_industry}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase">Subject</p>
                <p className="text-sm text-gray-700">{visit.subject}</p>
              </div>
              {visit.notes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{visit.notes}</p>
                </div>
              )}
              {visit.outcomes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Outcomes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{visit.outcomes}</p>
                </div>
              )}
              {visit.owner_alias && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Owner</p>
                  <p className="text-sm text-gray-700">{visit.owner_alias}</p>
                </div>
              )}
              {visit.created_at && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Created</p>
                  <p className="text-sm text-gray-700">
                    {new Date(visit.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-3">
            <AgentRunPanel run={latestRun} onRefresh={fetchVisit} />
          </div>
        </div>
      </main>
    </div>
  )
}
