import { FlowDefinition } from "@/agent/flow"
import type { FlowContext } from "@/agent/flow"

export class RecallFlow extends FlowDefinition {
  name = "Recall"
  description = "Handle equipment recall: assess severity, order parts, schedule service, execute"

  async execute(ctx: FlowContext) {
    ctx.state.set("trigger", "recall")

    const body = ctx.input.email?.body || ""
    const severityResult = await ctx.tools.call("assess_recall_severity", { text: body }, "")
    const severityContent = severityResult.artifactContent || ""
    const isCritical = severityContent.includes("critical")

    const scope = await ctx.decide("recall_scope", {
      prompt: "How many units are affected by this recall?",
      choices: ["single", "multiple"],
    })

    if (isCritical) {
      await ctx.tools.call("send_notification", {
        role: "admin",
        message: "CRITICAL recall detected. Immediate action required.",
      }, "")
    }

    const partsResult = await ctx.tools.call("order_parts", {
      part: "X100-bracket",
      quantity: scope === "multiple" ? 15 : 5,
    }, "")
    const partsContent = partsResult.artifactContent || ""
    const orderId = partsContent.match(/Order #: (\S+)/)?.[1] || "unknown"

    await ctx.tools.call("schedule_visit", {
      customer: "Acme Dental",
      reason: `Equipment recall — X100 bracket assembly${isCritical ? " (URGENT)" : ""}`,
    }, "")

    await ctx.waitFor("parts_arrived", {
      check: async () => {
        const check = await ctx.tools.call("check_part_inventory", { partId: orderId }, "")
        return (check.artifactContent || "").includes("in stock")
      },
      retry: { max: 3, backoff: "1m", onTimeout: "escalate" },
    })

    const recallResult = await ctx.decide("recall_outcome", {
      prompt: "Was the recall executed successfully?",
      choices: ["success", "failed"],
    })

    if (recallResult === "success") {
      await ctx.tools.call("execute_recall", {
        equipmentId: "X100-4421",
        partsUsed: ["X100-bracket"],
      }, "")

      const needsNotification = await ctx.decide("customer_notification", {
        prompt: "Should the customer be notified about the completed recall?",
        choices: [true, false],
      })

      if (needsNotification) {
        await ctx.tools.call("notify_customer", {
          customer: "Acme Dental",
          subject: "Recall Completed — X100 Bracket Assembly",
          message: "The recall for your X100 Imaging Unit has been completed. All affected brackets have been replaced.",
        }, "")
      }
    } else {
      await ctx.tools.call("send_notification", {
        role: "admin",
        message: "Recall execution FAILED for X100-4421. Escalating to engineering team.",
      }, "")
    }
  }
}
