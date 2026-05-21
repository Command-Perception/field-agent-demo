import { RecallFlow } from "../samples/recall-flow"
import { runFlow } from "../../src/agent/flowEngine"
import type { FlowInput } from "../../src/agent/types"

async function main() {
  const input: FlowInput = {
    trigger: "email",
    email: {
      from: "recalls@dental-mfg.example.com",
      subject: "URGENT: Recall Notice — X100 Bracket Assembly",
      body: "Safety recall for X100 bracket assembly (lot #B4-2024). Affected units: 3 at Acme Dental.",
      flow_hint: "recall",
    },
  }

  const flow = new RecallFlow()
  console.log(`Executing flow: ${flow.name}`)

  const trace = await runFlow(flow, input)

  console.log(`Flow complete: ${trace.events.length} events`)

  for (const event of trace.events) {
    const icon = event.type === "completed" ? "✓" :
      event.type === "tool_result" || event.type === "step_end" ? "→" :
      event.type === "failed" ? "✗" :
      event.type === "decision" ? "◆" :
      event.type === "branch_taken" ? "◈" :
      event.type === "hitl_waiting" ? "👤" :
      event.type === "tool_call" ? "⚙" : "·"
    console.log(`  ${icon} [${event.type}] ${event.label}`)
    if (event.data?.chosen !== undefined) {
      console.log(`     → chose: ${JSON.stringify(event.data.chosen)}`)
    }
    if (event.data?.chosen !== undefined) {
      console.log(`     → chose: ${JSON.stringify(event.data.chosen)}`)
    }
  }

  console.log("\n✅ Recall flow executed successfully!")
}

main().catch(console.error)
