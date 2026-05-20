"use client"

import { useState } from "react"
import HITLModal from "./HITLModal"

type Task = {
  id: string
  run_id: string
  type: "agent" | "human" | "approval"
  title: string
  description?: string
  state: string
  result?: Record<string, unknown>
}

type TaskListProps = {
  tasks: Task[]
  onRefresh: () => void
}

const TYPE_META: Record<string, { icon: string; bg: string }> = {
  agent: { icon: "\u{1F916}", bg: "bg-blue-100" },
  human: { icon: "\u{1F9D1}\u200D", bg: "bg-orange-100" },
  approval: { icon: "\u2705", bg: "bg-purple-100" },
}

const STATE_BADGE: Record<string, { label: string; classes: string }> = {
  pending_human: { label: "Pending", classes: "bg-yellow-100 text-yellow-800" },
  ready_to_run: { label: "Ready", classes: "bg-blue-100 text-blue-800" },
  done: { label: "Done", classes: "bg-green-100 text-green-800" },
  blocked: { label: "Blocked", classes: "bg-red-100 text-red-800" },
}

export default function TaskList({ tasks, onRefresh }: TaskListProps) {
  const [modalTask, setModalTask] = useState<Task | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {tasks.length === 0 && (
        <p className="text-sm text-gray-400 italic">No tasks yet.</p>
      )}
      {tasks.map((task) => {
        const meta = TYPE_META[task.type] ?? { icon: "\u2753", bg: "bg-gray-100" }
        const badge = STATE_BADGE[task.state] ?? { label: task.state, classes: "bg-gray-100 text-gray-600" }
        return (
          <div
            key={task.id}
            className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            <span
              className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center text-sm shrink-0`}
            >
              {meta.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-800">{task.title}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.classes}`}>
                  {badge.label}
                </span>
              </div>
              {task.description && (
                <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
              )}
              {task.state === "pending_human" && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setModalTask(task)}
                    className="text-xs font-semibold px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setModalTask(task)}
                    className="text-xs font-semibold px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              {task.state === "done" && task.result && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  Result: {JSON.stringify(task.result)}
                </p>
              )}
            </div>
          </div>
        )
      })}
      {modalTask && (
        <HITLModal
          task={modalTask}
          onResolve={() => {
            setModalTask(null)
            onRefresh()
          }}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  )
}
