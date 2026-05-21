"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"

export type FlowNodeData = Record<string, unknown> & {
  label: string
  description?: string
  nodeType: "trigger" | "step" | "decision" | "hitl" | "precondition" | "parallel"
  state: "pending" | "active" | "completed" | "failed" | "blocked"
}

export type FlowNode = Node<FlowNodeData, "flowNode">

const NODE_STYLES: Record<string, { shape: string; border: string; bg: string; text: string; icon: string }> = {
  trigger: { shape: "rounded-full", border: "border-slate-600", bg: "bg-slate-800", text: "text-white", icon: "●" },
  step: { shape: "rounded-lg", border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-900", icon: "▭" },
  decision: { shape: "rounded-lg", border: "border-amber-400 border-l-8", bg: "bg-amber-50", text: "text-amber-900", icon: "◆" },
  hitl: { shape: "rounded-lg", border: "border-red-400", bg: "bg-red-50", text: "text-red-900", icon: "👤" },
  precondition: { shape: "rounded-lg border-dashed", border: "border-amber-400", bg: "bg-amber-50", text: "text-amber-900", icon: "⏳" },
  parallel: { shape: "rounded-lg", border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-900", icon: "⬡" },
}

const STATE_COLORS: Record<string, string> = {
  pending: "bg-gray-300",
  active: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  blocked: "bg-amber-400",
}

function FlowNode({ data }: NodeProps<FlowNode>) {
  const style = NODE_STYLES[data.nodeType] || NODE_STYLES.step

  return (
    <div className={`px-4 py-2.5 ${style.shape} ${style.border} ${style.bg} border-2 shadow-sm min-w-[140px]`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATE_COLORS[data.state] || STATE_COLORS.pending} ${
          data.state === "active" ? "animate-pulse" : ""
        }`} />
        <span className="text-xs text-gray-400 shrink-0">{style.icon}</span>
        <span className={`text-sm font-semibold ${style.text}`}>{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-gray-500 mt-1 ml-7">{data.description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

export default memo(FlowNode)
