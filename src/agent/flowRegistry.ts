import type { FlowDefinition } from "./flow"
import { SalesVisitFlow } from "@samples/sales-visit-flow"
import { MaintenanceFlow } from "@samples/maintenance-flow"
import { RecallFlow } from "@samples/recall-flow"

export const flowRegistry = new Map<string, FlowDefinition>([
  ["sales_visit", new SalesVisitFlow()],
  ["maintenance", new MaintenanceFlow()],
  ["recall", new RecallFlow()],
])

export function getFlow(hint: string): FlowDefinition | undefined {
  return flowRegistry.get(hint)
}

export function listFlowKeys(): string[] {
  return Array.from(flowRegistry.keys())
}
