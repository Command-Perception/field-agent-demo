"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import StepItem from "./StepItem"
import type { ExecutionEvent } from "@/agent/types"

type StepViewProps = {
  events: ExecutionEvent[]
  cursor: number
  traceName?: string
}

export default function StepView({ events, cursor, traceName }: StepViewProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">📋 Steps</h3>
        {traceName && (
          <span className="text-xs text-gray-400">{traceName}</span>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        {events.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No steps yet</p>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <StepItem
                key={i}
                event={event}
                isActive={i === cursor}
                isPast={i < cursor}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
