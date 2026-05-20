"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ExecutionEvent } from "@/agent/types"

type DebugOverlayProps = {
  events: ExecutionEvent[]
  children?: React.ReactNode
}

export default function DebugOverlay({ events, children }: DebugOverlayProps) {
  return (
    <Sheet>
      {children ? (
        <SheetTrigger>{children}</SheetTrigger>
      ) : (
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" title="Debug Console">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </Button>
          }
        />
      )}
      
      <SheetContent side="right" className="w-[480px] bg-slate-900 text-slate-200 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-slate-200 font-mono text-sm">🐛 Debug Console</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-4">
          <div className="font-mono text-xs space-y-1">
            {events.length === 0 ? (
              <div className="text-slate-500">No events recorded yet.</div>
            ) : (
              events.map((event, i) => (
                <div key={i} className="py-1 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      event.type === "completed" || event.type === "precondition_met" || event.type === "tool_result"
                        ? "bg-green-400"
                        : event.type === "failed"
                        ? "bg-red-400"
                        : event.type === "hitl_waiting"
                        ? "bg-yellow-400"
                        : "bg-blue-400"
                    }`} />
                    <span className={
                      event.type === "failed" ? "text-red-400" :
                      event.type === "tool_call" || event.type === "tool_result" ? "text-blue-400" :
                      event.type === "hitl_waiting" ? "text-yellow-400" :
                      event.type === "completed" ? "text-green-400" :
                      "text-slate-300"
                    }>
                      [{event.type}]
                    </span>
                    <span>{event.label}</span>
                  </div>
                  {event.data && (
                    <pre className="ml-4 text-slate-500 mt-0.5 text-[10px] overflow-x-auto">
                      {JSON.stringify(event.data, null, 1).slice(0, 200)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
