"use client"

const PHASES = ["ingest", "extract", "plan", "act", "done"] as const
const PHASE_LABELS: Record<string, string> = {
  ingest: "Ingest",
  extract: "Extract",
  plan: "Plan",
  act: "Act",
  done: "Done",
}

type PipelineStepperProps = {
  currentPhase: string | null
  runStatus: string | null
}

export default function PipelineStepper({ currentPhase, runStatus }: PipelineStepperProps) {
  const isRunning = runStatus === "running"

  const isActive = (phase: string) => {
    if (runStatus === "completed" || runStatus === "failed") return true
    if (runStatus === "waiting_on_human" && currentPhase) {
      const idx = PHASES.indexOf(currentPhase as any)
      const phaseIdx = PHASES.indexOf(phase as any)
      return phaseIdx <= idx
    }
    if (!currentPhase) return false
    const idx = PHASES.indexOf(currentPhase as any)
    const phaseIdx = PHASES.indexOf(phase as any)
    return phaseIdx < idx || (phaseIdx === idx && isRunning)
  }

  const isCurrent = (phase: string) => phase === currentPhase && isRunning

  return (
    <div className="flex items-center gap-0 w-full">
      {PHASES.map((phase, i) => (
        <div key={phase} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                isCurrent(phase)
                  ? "bg-blue-600 text-white"
                  : isActive(phase)
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {isActive(phase) && !isCurrent(phase) ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                isCurrent(phase)
                  ? "text-blue-700"
                  : isActive(phase)
                  ? "text-green-700"
                  : "text-gray-400"
              }`}
            >
              {PHASE_LABELS[phase]}
            </span>
          </div>
          {i < PHASES.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                isActive(PHASES[i + 1]) ? "bg-green-400" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
