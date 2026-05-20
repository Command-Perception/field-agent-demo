import { FlowDefinition } from "@/agent/flow"
import type { FlowContext } from "@/agent/flow"

export class SalesVisitFlow extends FlowDefinition {
  name = "Sales Visit"
  description = "Process a sales visit lunch expense with per-diem checks and HITL gates"

  async execute(ctx: FlowContext) {
    ctx.state.set("trigger", "sales_visit")

    const receiptAttached = await ctx.decide("receipt_check", {
      prompt: "Does the expense report include a receipt?",
      choices: [true, false],
    })

    if (!receiptAttached) {
      await ctx.tools.call("verify_receipt", { attached: false }, "")
      await ctx.tools.call("send_notification", {
        role: "sales_agent",
        message: "Please provide a receipt for your expense submission.",
      }, "")
    }

    const body = ctx.input.email?.body || ""
    const amountMatch = body.match(/\$(\d+\.?\d*)/)
    const amount = amountMatch ? amountMatch[0].replace("$", "") : "100"
    const parsedAmount = parseFloat(amount) || 100

    const perDiemResult = await ctx.tools.call("check_per_diem", {
      amount: parsedAmount,
      category: "entertainment",
    }, "")

    const content = perDiemResult.artifactContent || ""
    const isOverLimit = content.includes("EXCEEDS")

    if (isOverLimit) {
      const approval = await ctx.requestApproval("Expense exceeds per diem limit", {
        amount: parsedAmount,
        category: "entertainment",
        submittedBy: ctx.input.email?.from || "unknown",
      })

      if (!approval.approved) {
        await ctx.tools.call("send_notification", {
          role: "sales_agent",
          message: `Expense of $${parsedAmount} was rejected. Reason: ${approval.feedback || "No reason given"}.`,
        }, "")
        return
      }
    }

    const isExistingClient = await ctx.decide("client_type", {
      prompt: "Is this an existing client or a new prospect?",
      choices: ["existing", "prospect"],
    })

    await ctx.tools.call("submit_expense_report", {
      amount: parsedAmount,
      merchant: "The Grill",
      category: "entertainment",
      description: `Lunch with ${
        isExistingClient === "existing" ? "existing client" : "new prospect"
      } to discuss imaging software proposal`,
    }, "")

    await ctx.tools.call("send_notification", {
      role: "admin",
      message: `Expense of $${parsedAmount} has been processed for ${ctx.input.email?.from || "unknown"}.`,
    }, "")
  }
}
