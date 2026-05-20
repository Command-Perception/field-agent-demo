"use client"

import { useCallback, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  useNodesState,
  useEdgesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import FlowNode from "./FlowNode"
import FlowLegend from "./FlowLegend"
import type { FlowTrace, ExecutionEvent } from "@/agent/types"

type FlowChartProps = {
  trace: FlowTrace | null
  cursor: number
}

function buildNodesAndEdges(events: ExecutionEvent[], cursor: number): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  events.forEach((event, i) => {
    const isPast = i < cursor
    const isCurrent = i === cursor
    const state = isCurrent ? "active" : isPast ? "completed" : "pending"

    let nodeType = "step"
    if (event.type === "decision" || event.type === "branch_taken") nodeType = "decision"
    if (event.type === "hitl_waiting" || event.type === "hitl_resolved") nodeType = "hitl"
    if (event.type === "precondition_check" || event.type === "precondition_met") nodeType = "precondition"
    if (event.type === "tool_call" || event.type === "tool_result") nodeType = "step"

    if (i === 0) nodeType = "trigger"

    const isBranch = event.type === "branch_taken"

    nodes.push({
      id: `event-${i}`,
      type: "flowNode",
      position: { x: isBranch ? 300 : 200, y: i * 100 },
      data: {
        label: isBranch ? `→ ${event.label}` : event.label,
        description: event.description,
        nodeType,
        state: isCurrent ? "active" : isPast && event.type === "failed" ? "failed" : state,
      },
    })

    if (i > 0) {
      edges.push({
        id: `edge-${i - 1}-${i}`,
        source: `event-${i - 1}`,
        target: `event-${i}`,
        animated: isCurrent,
        style: { stroke: isPast ? "#22c55e" : isCurrent ? "#3b82f6" : "#d1d5db", strokeWidth: 2 },
      })
    }
  })

  return { nodes, edges }
}

const nodeTypes: NodeTypes = { flowNode: FlowNode }

export default function FlowChart({ trace, cursor }: FlowChartProps) {
  const events = trace?.events || []
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(events, cursor),
    [events, cursor]
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onInit = useCallback(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  if (!trace) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p className="text-sm">Select an email or test flow to begin</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>
      <FlowLegend />
    </div>
  )
}
