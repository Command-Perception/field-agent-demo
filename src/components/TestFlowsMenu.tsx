"use client"

const FLOWS = [
  { hint: "sales_visit", label: "🍽️ Sales Visit", desc: "Expense approval flow" },
  { hint: "maintenance", label: "🔧 Maintenance", desc: "Equipment service flow" },
  { hint: "recall", label: "⚠️ Recall", desc: "Part order + service flow" },
]

type TestFlowsMenuProps = {
  onLaunchFlow: (flowHint: string) => void
  running?: string | null
}

export default function TestFlowsMenu({ onLaunchFlow, running }: TestFlowsMenuProps) {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">🧪 Test Flows</h3>
      <div className="space-y-2">
        {FLOWS.map((flow) => (
          <div
            key={flow.hint}
            className={`bg-white border rounded-lg p-3 transition-all ${
              running === flow.hint
                ? "border-blue-500 shadow-sm"
                : "border-gray-200 hover:border-blue-400 hover:shadow-sm cursor-pointer"
            }`}
            onClick={() => !running && onLaunchFlow(flow.hint)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{flow.label.split(" ")[0]}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{flow.label}</div>
                <div className="text-xs text-gray-500">{flow.desc}</div>
              </div>
              {running === flow.hint && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
