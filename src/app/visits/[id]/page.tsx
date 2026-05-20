"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import TaskList from "@/components/TaskList"
import ArtifactViewer from "@/components/ArtifactViewer"
import { getVisit } from "@/lib/services/visits"
import { runAgent } from "@/lib/services/agent"
import type { VisitWithRuns } from "@/lib/services/visits"

export default function VisitDetailPage() {
  const params = useParams()
  const [visit, setVisit] = useState<VisitWithRuns | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchVisit = useCallback(async () => {
    try {
      const data = await getVisit(params.id as string)
      setVisit(data)
    } catch {
      setVisit(null)
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
      await runAgent(params.id as string)
      await fetchVisit()
    } catch {
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
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
            {running ? "Running..." : "Run Agent"}
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
              {visit.runs && visit.runs.length > 1 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Previous Runs</p>
                  <div className="flex flex-col gap-1 mt-1">
                    {visit.runs.slice(1, 4).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${
                          r.status === "completed" ? "bg-green-400" :
                          r.status === "failed" ? "bg-red-400" : "bg-yellow-400"
                        }`} />
                        <span>{r.status}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-3">
            {latestRun ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Run</h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    latestRun.status === "completed" ? "bg-green-100 text-green-700" :
                    latestRun.status === "failed" ? "bg-red-100 text-red-700" :
                    latestRun.status === "waiting_on_human" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {latestRun.status}
                  </span>
                </div>
                {latestRun.summary && (
                  <p className="text-sm text-gray-600">{latestRun.summary}</p>
                )}
                {latestRun.tasks && latestRun.tasks.length > 0 && (
                  <TaskList tasks={latestRun.tasks as any} onRefresh={fetchVisit} />
                )}
                {latestRun.artifacts && latestRun.artifacts.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Artifacts</h3>
                    {latestRun.artifacts.map((a: any) => (
                      <ArtifactViewer key={a.id} artifact={a} expanded={false} onToggle={() => {}} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">No runs yet.</p>
                <p className="text-xs text-gray-300 mt-1">Click &quot;Run Agent&quot; to start.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
