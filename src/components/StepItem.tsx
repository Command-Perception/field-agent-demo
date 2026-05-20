"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { ExecutionEvent } from "@/agent/types"

type StepItemProps = {
  event: ExecutionEvent
  isActive: boolean
  isPast: boolean
}

function getStatusLabel(event: ExecutionEvent): { label: string; variant: "default" | "outline" | "secondary" } {
  if (event.type === "failed") return { label: "Failed", variant: "default" }
  if (event.type === "completed") return { label: "Done", variant: "default" }
  if (event.type === "hitl_waiting") return { label: "Needs Approval", variant: "outline" }
  if (event.type === "tool_call") return { label: "Tool", variant: "secondary" }
  if (event.type === "decision") return { label: "Decision", variant: "outline" }
  if (event.type === "branch_taken") return { label: "Branch", variant: "outline" }
  return { label: "Info", variant: "secondary" }
}

function getStatusColor(event: ExecutionEvent, isPast: boolean): string {
  if (event.type === "failed") return "bg-red-500"
  if (isPast) return "bg-green-500"
  return "bg-gray-300"
}

function EventIcon({ event, isPast }: { event: ExecutionEvent; isPast: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full ${getStatusColor(event, isPast)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
      {isPast ? "✓" : event.sequence + 1}
    </div>
  )
}

export default function StepItem({ event, isActive, isPast }: StepItemProps) {
  const [expanded, setExpanded] = useState(false)
  const status = getStatusLabel(event)

  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer transition-all ${
        isActive
          ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50"
          : isPast
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50 opacity-60"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <EventIcon event={event} isPast={isPast} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-900" : isPast ? "text-green-900" : "text-gray-500"}`}>
            {event.label}
          </p>
        </div>
        <Badge variant={status.variant} className="text-[10px] shrink-0">
          {status.label}
        </Badge>
      </div>

      {event.description && (
        <p className="text-xs text-gray-500 mt-1 ml-7">{event.description}</p>
      )}

      {expanded && event.data && (
        <div className="mt-2 ml-7 bg-gray-900 text-gray-200 rounded-lg p-2 text-[10px] font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(event.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
