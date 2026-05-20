"use client"

import { useState } from "react"
import TaskList from "./TaskList"

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
  type: "agent" | "human" | "approval"
  title: string
  description?: string
  state: string
  result?: Record<string, unknown>
}

type AgentRun = {
  id: string
  status: "running" | "waiting_on_human" | "completed" | "failed"
  summary?: string
  created_at: string
  updated_at: string
  tasks?: Task[]
  artifacts?: Artifact[]
}

type AgentRunPanelProps = {
  run: AgentRun | null
  onRefresh: () => void
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  running: { label: "Running", classes: "bg-blue-500 animate-pulse text-white" },
  waiting_on_human: { label: "Waiting on Human", classes: "bg-yellow-400 text-yellow-900" },
  completed: { label: "Completed", classes: "bg-green-500 text-white" },
  failed: { label: "Failed", classes: "bg-red-500 text-white" },
}

export default function AgentRunPanel({ run, onRefresh }: AgentRunPanelProps) {
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null)

  if (!run) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400">
        <p className="text-sm">No agent run yet. Click &quot;Run Agent&quot; to start.</p>
      </div>
    )
  }

  const meta = STATUS_META[run.status] ?? { label: run.status, classes: "bg-gray-200 text-gray-700" }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Agent Run</h3>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.classes}`}>
          {meta.label}
        </span>
      </div>
      {run.summary && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
          {run.summary}
        </p>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tasks</p>
        <TaskList tasks={run.tasks ?? []} onRefresh={onRefresh} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Artifacts</p>
        {(!run.artifacts || run.artifacts.length === 0) ? (
          <p className="text-xs text-gray-400 italic">No artifacts yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {run.artifacts.map((artifact) => (
              <div key={artifact.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() =>
                    setExpandedArtifact(expandedArtifact === artifact.id ? null : artifact.id)
                  }
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span>{artifact.title}</span>
                  <span className="text-xs text-gray-400">
                    {expandedArtifact === artifact.id ? "\u25B2" : "\u25BC"}
                  </span>
                </button>
                {expandedArtifact === artifact.id && artifact.content && (
                  <pre className="px-3 pb-3 text-xs text-gray-600 whitespace-pre-wrap font-sans border-t border-gray-100 pt-2">
                    {artifact.content}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
