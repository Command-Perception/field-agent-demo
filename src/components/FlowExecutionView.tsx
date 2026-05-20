"use client"

import { useCallback } from "react"
import ThreePanelLayout from "./ThreePanelLayout"
import InboxPanel from "./InboxPanel"
import FlowChart from "./FlowChart"
import StepView from "./StepView"
import PlaybackControls from "./PlaybackControls"
import TestFlowsMenu from "./TestFlowsMenu"
import DebugOverlay from "./DebugOverlay"
import ResetDemoButton from "./ResetDemoButton"
import { useExecutionReplay } from "@/hooks/useExecutionReplay"
import { runFlow, listFlowTraces } from "@/lib/services/flows"
import type { MockEmail } from "@/agent/types"

export default function FlowExecutionView() {
  const [state, controls] = useExecutionReplay()

  const handleSelectEmail = useCallback(async (email: MockEmail) => {
    try {
      const trace = await runFlow(email.flow_hint, email.id)
      controls.loadTrace(trace)
    } catch {
      try {
        const traces = await listFlowTraces()
        const match = traces.find((t) =>
          t.execution_trace?.flow_name?.toLowerCase().includes(email.flow_hint)
        )
        if (match) {
          controls.loadTrace(match.execution_trace)
        }
      } catch {}
    }
  }, [controls])

  const handleLaunchFlow = useCallback(async (flowHint: string) => {
    try {
      const trace = await runFlow(flowHint)
      controls.loadTrace(trace)
    } catch {
      try {
        const traces = await listFlowTraces()
        const match = traces.find((t) =>
          t.execution_trace?.flow_name?.toLowerCase().includes(flowHint.replace("_", " "))
        )
        if (match) {
          controls.loadTrace(match.execution_trace)
        }
      } catch {}
    }
  }, [controls])

  const handleReset = useCallback(() => {
    controls.clearTrace()
    window.location.reload()
  }, [controls])

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-slate-800 text-white px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-bold text-base">Field Agent</span>
          <span className="text-slate-400 text-sm cursor-pointer hover:text-white">Dashboard</span>
          <span className="text-slate-400 text-sm cursor-pointer hover:text-white">Flows</span>
          <span className="text-slate-400 text-sm cursor-pointer hover:text-white">History</span>
        </div>
        <div className="flex items-center gap-3">
          <ResetDemoButton onReset={handleReset} />
          <DebugOverlay events={state.trace?.events || []} />
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ThreePanelLayout
          left={
            <>
              <InboxPanel
                onSelectEmail={handleSelectEmail}
              />
              <TestFlowsMenu onLaunchFlow={handleLaunchFlow} />
            </>
          }
          center={
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <FlowChart trace={state.trace} cursor={state.cursor} />
              </div>
              {state.trace && (
                <PlaybackControls
                  cursor={state.cursor}
                  total={state.trace.events.length}
                  speed={state.speed}
                  autoplay={state.autoplay}
                  isAtStart={state.isAtStart}
                  isAtEnd={state.isAtEnd}
                  onPrev={controls.prev}
                  onNext={controls.next}
                  onSpeedChange={controls.setSpeed}
                  onToggleAutoplay={controls.toggleAutoplay}
                />
              )}
            </div>
          }
          right={
            <StepView
              events={state.visibleEvents}
              cursor={state.cursor}
              traceName={state.trace?.flow_name}
            />
          }
        />
      </div>
    </div>
  )
}
