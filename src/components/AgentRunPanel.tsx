"use client"

import { useState, useEffect } from "react"
import TaskList from "./TaskList"
import PipelineStepper from "./PipelineStepper"
import ArtifactViewer from "./ArtifactViewer"
import { useWebSocket } from "@/hooks/useWebSocket"

type Artifact = {
  id: string
  type: string
  title: string
  content?: string
  version: number
  created_at: string
}

type Task = {
  id: string
  run_id: string
  type: string
  title: string
  description?: string
  state: string
  result?: Record<string, unknown>
}

type AgentRun = {
  id: string
  status: string
  summary?: string
  created_at: string
  updated_at: string
  tasks?: Task[]
  artifacts?: Artifact[]
}

type AgentRunPanelProps = {
  run: AgentRun | null
  visitId: string
  onRefresh: () => void
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  running: { label: "Running", classes: "bg-blue-500 animate-pulse text-white" },
  waiting_on_human: { label: "Waiting on Human", classes: "bg-yellow-400 text-yellow-900" },
  completed: { label: "Completed", classes: "bg-green-500 text-white" },
  failed: { label: "Failed", classes: "bg-red-500 text-white" },
}

export default function AgentRunPanel({ run, visitId, onRefresh }: AgentRunPanelProps) {
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(run?.status || null)
  const [liveArtifacts, setLiveArtifacts] = useState<Artifact[]>(run?.artifacts || [])
  const [liveTasks, setLiveTasks] = useState<Task[]>(run?.tasks || [])

  useEffect(() => {
    setRunStatus(run?.status || null)
    setLiveArtifacts(run?.artifacts || [])
    setLiveTasks(run?.tasks || [])
  }, [run])

  useWebSocket({
    phase: (data) => {
      const phase = data.phase as string
      setCurrentPhase(phase)
      if (data.status === "started") {
        setRunStatus("running")
      }
    },
    artifact: () => {
      onRefresh()
    },
    task: () => {
      onRefresh()
    },
    task_done: () => {
      onRefresh()
    },
    status: (data) => {
      setRunStatus(data.status as string)
    },
    run_complete: () => {
      onRefresh()
    },
  })

  const meta = runStatus
    ? STATUS_META[runStatus] ?? { label: runStatus, classes: "bg-gray-200 text-gray-700" }
    : null

  if (!run) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400">
        <p className="text-sm">No agent run yet. Click &quot;Run Agent&quot; to start.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Agent Run</h3>
        {meta && (
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.classes}`}>
            {meta.label}
          </span>
        )}
      </div>

      {(runStatus === "running" || runStatus === "waiting_on_human" || runStatus === "completed" || runStatus === "failed") && (
        <PipelineStepper currentPhase={currentPhase} runStatus={runStatus} />
      )}

      {run.summary && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
          {run.summary}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tasks</p>
        <TaskList tasks={liveTasks} onRefresh={onRefresh} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Artifacts</p>
        {liveArtifacts.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No artifacts yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {liveArtifacts.map((artifact) => (
              <ArtifactViewer
                key={artifact.id}
                artifact={artifact}
                expanded={expandedArtifact === artifact.id}
                onToggle={() =>
                  setExpandedArtifact(expandedArtifact === artifact.id ? null : artifact.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
