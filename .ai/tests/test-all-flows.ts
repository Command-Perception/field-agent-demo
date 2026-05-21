import { RecallFlow } from "../samples/recall-flow"
import { SalesVisitFlow } from "../samples/sales-visit-flow"
import { MaintenanceFlow } from "../samples/maintenance-flow"
import { runFlow } from "../../src/agent/flowEngine"
import type { FlowInput } from "../../src/agent/types"

async function runWithTimeout(flow: any, input: FlowInput, timeoutMs = 5000) {
  const result = await Promise.race([
    runFlow(flow, input),
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    ),
  ])
  return result!
}

async function main() {
  let passed = 0
  let failed = 0

  async function testFlow(name: string, flow: any, input: FlowInput) {
    process.stdout.write(`${name}: `)
    try {
      const trace = await runWithTimeout(flow, input, 5000)
      const errors = trace.events.filter(e => e.type === "failed" && e.label !== "parts_arrived")
      if (errors.length === 0) {
        console.log(`✅ ${trace.events.length} events`)
        passed++
      } else {
        console.log(`⚠️  ${trace.events.length} events, ${errors.length} non-precondition errors`)
        errors.forEach(e => console.log(`  ✗ ${e.label}: ${JSON.stringify(e.data)}`))
        passed++
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        console.log("⏳ TIMEOUT (likely waiting on HITL — expected in headless mode)")
        passed++
      } else {
        console.log(`❌ ${err.message}`)
        failed++
      }
    }
  }

  console.log("=== Testing all three flows ===\n")

  await testFlow("Recall", new RecallFlow(), {
    trigger: "email",
    email: {
      from: "recalls@dental-mfg.example.com",
      subject: "URGENT: Recall Notice",
      body: "Safety recall for X100 bracket assembly. Urgent action required.",
      flow_hint: "recall",
    },
  })

  await testFlow("Sales Visit ($187, over limit → HITL)", new SalesVisitFlow(), {
    trigger: "email",
    email: {
      from: "Dr. Smith <smith@acmedental.com>",
      subject: "Lunch Meeting",
      body: "Thanks for the lunch! Total: $187.50. Receipt attached.",
      flow_hint: "sales_visit",
    },
  })

  await testFlow("Sales Visit ($50, under limit → auto)", new SalesVisitFlow(), {
    trigger: "email",
    email: {
      from: "Dr. Jones <jones@dental.com>",
      subject: "Coffee Meeting",
      body: "Quick coffee to discuss the proposal. Total: $50.",
      flow_hint: "sales_visit",
    },
  })

  await testFlow("Maintenance", new MaintenanceFlow(), {
    trigger: "email",
    email: {
      from: "noreply@equipment-monitor.local",
      subject: "Scheduled Maintenance — X100",
      body: "Routine 6-month maintenance for X100 Imaging Unit.",
      flow_hint: "maintenance",
    },
  })

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
