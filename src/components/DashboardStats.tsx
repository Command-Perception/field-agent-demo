type DashboardStatsProps = {
  totalVisits: number
  completedRuns: number
  pendingApprovals: number
  failedRuns: number
}

export default function DashboardStats({
  totalVisits,
  completedRuns,
  pendingApprovals,
  failedRuns,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Visits</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalVisits}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Completed Runs</p>
        <p className="text-2xl font-bold text-green-600 mt-1">{completedRuns}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Pending Approvals</p>
        <p className="text-2xl font-bold text-yellow-500 mt-1">{pendingApprovals}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Failed Runs</p>
        <p className="text-2xl font-bold text-red-500 mt-1">{failedRuns}</p>
      </div>
    </div>
  )
}
