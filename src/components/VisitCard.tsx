"use client"

import { useRouter } from "next/navigation"

type VisitRecord = {
  id: string
  account_name: string
  account_industry?: string
  subject: string
  notes?: string
  outcomes?: string
  owner_alias?: string
  created_at?: string
}

type VisitCardProps = {
  visit: VisitRecord
}

const STATUS_COLORS: Record<string, string> = {
  completed: "border-l-green-500",
  waiting_on_human: "border-l-yellow-400",
  running: "border-l-blue-500",
  failed: "border-l-red-500",
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  completed: { label: "Completed", classes: "bg-green-100 text-green-800" },
  waiting_on_human: { label: "Waiting", classes: "bg-yellow-100 text-yellow-800" },
  running: { label: "Running", classes: "bg-blue-100 text-blue-800" },
  failed: { label: "Failed", classes: "bg-red-100 text-red-800" },
}

export default function VisitCard({ visit }: VisitCardProps) {
  const router = useRouter()

  const latestStatus = (visit as any).latest_run_status ?? null
  const borderColor = latestStatus && STATUS_COLORS[latestStatus]
    ? STATUS_COLORS[latestStatus]
    : "border-l-gray-300"
  const badge = latestStatus && STATUS_BADGE[latestStatus]
    ? STATUS_BADGE[latestStatus]
    : { label: "No runs yet", classes: "bg-gray-100 text-gray-600" }

  return (
    <div
      onClick={() => router.push(`/visits/${visit.id}`)}
      className={`border-l-4 ${borderColor} bg-white rounded-xl shadow-sm p-5 cursor-pointer transition-shadow hover:shadow-md flex flex-col gap-2`}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-bold text-gray-900">{visit.account_name}</h3>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${badge.classes}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-sm text-gray-500">{visit.subject}</p>
      <div className="flex items-center gap-2 mt-1">
        {visit.account_industry && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
            {visit.account_industry}
          </span>
        )}
        {visit.owner_alias && (
          <span className="text-xs text-gray-400 ml-auto">{visit.owner_alias}</span>
        )}
      </div>
    </div>
  )
}
