import * as queries from "@/data/queries"
import VisitCard from "@/components/VisitCard"

type Visit = {
  id: string
  account_name: string
  account_industry?: string
  subject: string
  owner_alias?: string
  latest_run_status?: string | null
}

function getLatestRunStatus(visit: any): string | null {
  if (visit.latest_run_status) return visit.latest_run_status
  if (visit.runs?.length > 0) {
    const sorted = [...visit.runs].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sorted[0].status
  }
  return null
}

export default async function DashboardPage() {
  let visits: any[] = []
  try {
    visits = await queries.listVisitsWithLatestRun()
  } catch {
    visits = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Agent System — Visit Follow-up</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated post-visit follow-up with human-in-the-loop approval gates.
          </p>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {visits.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No visits found.</p>
            <p className="text-sm mt-1">Seed the database to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visits.map((visit: any) => (
              <VisitCard key={visit.id} visit={{ ...visit, latest_run_status: getLatestRunStatus(visit) }} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
