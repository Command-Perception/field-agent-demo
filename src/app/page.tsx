"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import VisitCard from "@/components/VisitCard"
import DashboardStats from "@/components/DashboardStats"
import { listVisits } from "@/lib/services/visits"
import type { Visit } from "@/lib/services/visits"

export default function DashboardPage() {
  const router = useRouter()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchVisits() {
    try {
      const data = await listVisits()
      setVisits(data)
    } catch {
      setVisits([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisits()
  }, [])

  const completed = visits.filter((v) => v.latest_run_status === "completed").length
  const pending = visits.filter((v) => v.latest_run_status === "waiting_on_human").length
  const failed = visits.filter((v) => v.latest_run_status === "failed").length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Field Agent</h1>
              <p className="text-sm text-gray-500 mt-1">
                Automated post-visit follow-up with human-in-the-loop approval gates.
              </p>
            </div>
            <button
              onClick={() => router.push("/new")}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              + New Visit
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        {!loading && visits.length > 0 && (
          <DashboardStats
            totalVisits={visits.length}
            completedRuns={completed}
            pendingApprovals={pending}
            failedRuns={failed}
          />
        )}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Loading...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No visits found.</p>
            <p className="text-sm mt-1">
              <a href="/new" className="text-blue-600 hover:underline">
                Create your first visit
              </a>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit as any} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
