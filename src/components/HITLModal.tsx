"use client"

import { useState } from "react"
import { resolveHITL } from "@/lib/services/agent"

type Task = {
  id: string
  run_id: string
  type: string
  title: string
  description?: string
  state: string
}

type HITLModalProps = {
  task: Task
  onResolve: () => void
  onClose: () => void
}

export default function HITLModal({ task, onResolve, onClose }: HITLModalProps) {
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleDecision(approved: boolean) {
    setSubmitting(true)
    try {
      await resolveHITL({
        runId: task.run_id,
        taskId: task.id,
        approved,
        feedback: feedback.trim() || undefined,
      })
      onResolve()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Human Review</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">{task.title}</p>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          )}
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback…"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleDecision(false)}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => handleDecision(true)}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}
