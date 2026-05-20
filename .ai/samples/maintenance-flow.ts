import { FlowDefinition } from "@/agent/flow"
import type { FlowContext } from "@/agent/flow"

export class MaintenanceFlow extends FlowDefinition {
  name = "Maintenance"
  description = "Schedule and execute routine equipment maintenance with warranty and parts checks"

  async execute(ctx: FlowContext) {
    ctx.state.set("trigger", "maintenance")

    const warrantyResult = await ctx.tools.call("check_warranty_status", {
      equipmentId: "X100-4421",
    }, "")
    const warrantyContent = warrantyResult.artifactContent || ""
    const inWarranty = warrantyContent.includes("In warranty")

    const partsResult = await ctx.tools.call("check_part_inventory", {
      partId: "X100-filter",
    }, "")
    const partsContent = partsResult.artifactContent || ""
    const inStock = partsContent.includes("in stock")

    if (!inWarranty) {
      const customerAcceptsQuote = await ctx.decide("quote_decision", {
        prompt: "Equipment is out of warranty. Should we generate a quote?",
        choices: ["yes_quote", "no_close"],
      })
      if (customerAcceptsQuote === "no_close") {
        await ctx.tools.call("send_notification", {
          role: "sales_agent",
          message: "Customer declined out-of-warranty quote. Maintenance closed.",
        }, "")
        return
      }
    }

    if (!inStock) {
      await ctx.waitFor("parts_available", {
        check: async () => {
          const check = await ctx.tools.call("check_part_inventory", { partId: "X100-filter" }, "")
          return (check.artifactContent || "").includes("in stock")
        },
        retry: { max: 3, backoff: "1m", onTimeout: "escalate" },
      })
    }

    const preference = await ctx.decide("scheduling_preference", {
      prompt: "Does the customer have a scheduling preference?",
      choices: ["morning", "afternoon", "no_preference"],
    })

    await ctx.tools.call("schedule_visit", {
      customer: "Acme Dental",
      reason: "Routine 6-month maintenance — X100 Imaging Unit",
      preference,
    }, "")

    const serviceResult = await ctx.decide("service_outcome", {
      prompt: "Was the maintenance completed successfully?",
      choices: ["success", "issue_found"],
    })

    await ctx.tools.call("create_service_record", {
      equipmentId: "X100-4421",
      status: serviceResult === "success" ? "completed" : "partial",
      notes: serviceResult === "success"
        ? "Routine maintenance completed. All systems nominal."
        : "Minor issue found during maintenance. Follow-up ticket created.",
    }, "")

    if (serviceResult === "issue_found") {
      await ctx.tools.call("send_notification", {
        role: "admin",
        message: "Issue found during X100 maintenance. Follow-up required.",
      }, "")
    }
  }
}
