"use client"

const ITEMS = [
  { color: "bg-green-500", label: "Completed" },
  { color: "bg-blue-500", label: "Active" },
  { color: "bg-amber-400", label: "Blocked" },
  { color: "bg-red-500", label: "Failed" },
  { color: "bg-gray-300", label: "Pending" },
]

export default function FlowLegend() {
  return (
    <div className="flex gap-4 justify-center text-xs text-gray-500 py-2">
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
