import { sendMessage } from "./client"
import * as queries from "../data/queries"

type ToolHandlerResult = {
  summary: string
  artifactType: string
  artifactTitle: string
  artifactContent: string
  followupTasks?: Array<{ title: string; description: string; state: string; type: string }>
}

type ToolHandler = (input: Record<string, unknown>, runId: string) => Promise<ToolHandlerResult>

async function generateDraftEmail(
  to: string,
  subject: string,
  body: string,
  context?: string
): Promise<string> {
  if (!process.env.CROFAI_API_KEY) {
    return `To: ${to}\nSubject: ${subject}\n\n${body}`
  }
  try {
    const response = await sendMessage({
      system: "You are a sales email writer. Polish the provided draft into a professional email.",
      messages: [{
        role: "user",
        content: `Recipient: ${to}\nSubject: ${subject}\nContext: ${context || "N/A"}\n\nDraft body:\n${body}\n\nWrite the polished email.`,
      }],
    })
    const text = response.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n")
    return text
  } catch {
    return `To: ${to}\nSubject: ${subject}\n\n${body}`
  }
}

const toolHandlers: Record<string, ToolHandler> = {
  draft_email: async (input, runId) => {
    const { to, subject, body, context } = input as {
      to: string; subject: string; body: string; context?: string
    }
    const email = await generateDraftEmail(to, subject, body, context)
    return {
      summary: `Email drafted to ${to}: ${subject}`,
      artifactType: "email_draft",
      artifactTitle: `Email: ${subject}`,
      artifactContent: email,
    }
  },

  research_question: async (input, runId) => {
    const { question, context } = input as { question: string; context?: string }
    let research = ""
    if (process.env.CROFAI_API_KEY) {
      try {
        const response = await sendMessage({
          system: "You are a sales research assistant. Provide concise, actionable research findings.",
          messages: [{
            role: "user",
            content: `Research the following question for a sales follow-up:\n\nQuestion: ${question}\nContext: ${context || "N/A"}\n\nProvide findings with sources where applicable.`,
          }],
        })
        research = response.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n")
      } catch {
        research = `Research summary for: ${question}\n\nBased on available context: ${context || "No additional context provided."}\n\nRecommended to gather more information from the customer.`
      }
    } else {
      research = `Research findings for: ${question}\n\nAnalysis based on visit context:\n${context || "No additional context"}\n\nStatus: Further investigation recommended.`
    }
    return {
      summary: `Researched: ${question}`,
      artifactType: "research",
      artifactTitle: `Research: ${question.slice(0, 60)}`,
      artifactContent: research,
    }
  },

  create_followup_task: async (input, runId) => {
    const { title, description, requiresApproval } = input as {
      title: string; description?: string; dueBy?: string; requiresApproval?: boolean
    }
    const taskState = requiresApproval ? "pending_human" : "ready_to_run"
    const taskType = requiresApproval ? "approval" : "agent"
    const task = await queries.addTask(runId, {
      type: taskType,
      title,
      description: description || "",
      state: taskState,
    })
    return {
      summary: `Created follow-up task: ${title}`,
      artifactType: "note",
      artifactTitle: `Task created: ${title}`,
      artifactContent: `Task "${title}" created with state "${taskState}".\n${description ? `Description: ${description}\n` : ""}Task ID: ${task.id}`,
    }
  },

  check_expense: async (input, runId) => {
    const { amount, merchant, category, purpose } = input as {
      amount: number; merchant: string; category: string; purpose: string
    }
    const policy: Record<string, { dailyLimit: number; requiresApproval: boolean; notes: string }> = {
      travel: { dailyLimit: 500, requiresApproval: false, notes: "Airfare and lodging pre-approved for Q2" },
      meals: { dailyLimit: 75, requiresApproval: true, notes: "Meals over $75/client meal require manager approval" },
      supplies: { dailyLimit: 200, requiresApproval: false, notes: "Standard office supplies" },
      entertainment: { dailyLimit: 100, requiresApproval: true, notes: "Client entertainment requires pre-approval" },
      other: { dailyLimit: 100, requiresApproval: true, notes: "Review required for uncategorized expenses" },
    }
    const rule = policy[category] || policy.other
    const overLimit = amount > rule.dailyLimit
    const result = overLimit
      ? `FLAGGED: $${amount} at ${merchant} (${category}) exceeds daily limit of $${rule.dailyLimit}. ${rule.notes}`
      : `APPROVED: $${amount} at ${merchant} (${category}) is within policy. ${rule.notes}`

    return {
      summary: `Expense check for ${merchant}: ${overLimit ? "FLAGGED" : "APPROVED"}`,
      artifactType: "expense_check",
      artifactTitle: `Expense: ${merchant} - $${amount}`,
      artifactContent: result,
    }
  },

  generate_proposal_outline: async (input, runId) => {
    const { customerName, products, keyPoints } = input as {
      customerName: string; products: string[]; keyPoints: string[]
    }
    let outline = ""
    if (process.env.CROFAI_API_KEY) {
      try {
        const response = await sendMessage({
          system: "You are a proposal writer. Generate a detailed proposal outline.",
          messages: [{
            role: "user",
            content: `Generate a proposal outline for:\nCustomer: ${customerName}\nProducts: ${products.join(", ")}\nKey Points:\n${keyPoints.map((kp) => `  - ${kp}`).join("\n")}`,
          }],
        })
        outline = response.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n")
      } catch {
        outline = `Proposal Outline for ${customerName}\n${"=".repeat(40)}\n\nProducts: ${products.join(", ")}\n\nKey Sections:\n1. Executive Summary\n2. ${products[0] || "Solution"} Overview\n3. Implementation Plan\n4. Timeline & Milestones\n5. Investment & Pricing\n6. Next Steps`
      }
    } else {
      outline = `Proposal Outline for ${customerName}\n${"=".repeat(40)}\n\nProducts: ${products.join(", ")}\n\nKey Sections:\n1. Executive Summary\n2. ${products[0] || "Solution"} Overview\n3. Implementation Plan\n4. Timeline & Milestones\n5. Investment & Pricing\n6. Next Steps`
    }
    return {
      summary: `Proposal outline generated for ${customerName}`,
      artifactType: "proposal",
      artifactTitle: `Proposal: ${customerName}`,
      artifactContent: outline,
    }
  },

  send_notification: async (input, runId) => {
    const { role, message } = input as { role: string; message: string }
    return {
      summary: `Notification sent to ${role}`,
      artifactType: "note",
      artifactTitle: `Notification: ${role}`,
      artifactContent: `To: ${role}\nMessage: ${message}`,
    }
  },

  create_service_record: async (input, runId) => {
    const { equipmentId, status, notes } = input as { equipmentId: string; status: string; notes?: string }
    return {
      summary: `Service record created for ${equipmentId}: ${status}`,
      artifactType: "note",
      artifactTitle: `Service: ${equipmentId}`,
      artifactContent: `Equipment: ${equipmentId}\nStatus: ${status}\nNotes: ${notes || "N/A"}`,
    }
  },

  get_customer_info: async (input, runId) => {
    const { name } = input as { name: string }
    return {
      summary: `Customer info retrieved for ${name}`,
      artifactType: "research",
      artifactTitle: `Customer: ${name}`,
      artifactContent: JSON.stringify({
        name,
        accountType: "dental_practice",
        status: "active",
        contact: "Dr. Smith",
        since: "2023",
      }),
    }
  },

  submit_expense_report: async (input, runId) => {
    const { amount, merchant, category, description } = input as {
      amount: number; merchant: string; category: string; description?: string
    }
    return {
      summary: `Expense submitted: $${amount} at ${merchant}`,
      artifactType: "expense_check",
      artifactTitle: `Expense: ${merchant} - $${amount}`,
      artifactContent: `Amount: $${amount}\nMerchant: ${merchant}\nCategory: ${category}\nDescription: ${description || "N/A"}`,
    }
  },

  check_per_diem: async (input, runId) => {
    const { amount, category } = input as { amount: number; category: string }
    const limits: Record<string, number> = {
      meals: 75,
      entertainment: 100,
      travel: 500,
      supplies: 200,
    }
    const limit = limits[category] || 100
    const over = amount > limit
    return {
      summary: `Per diem check: $${amount} vs $${limit} limit — ${over ? "OVER" : "WITHIN"}`,
      artifactType: "expense_check",
      artifactTitle: `Per Diem: $${amount}`,
      artifactContent: `Amount: $${amount}\nLimit: $${limit}\nResult: ${over ? "EXCEEDS LIMIT — requires approval" : "Within policy — auto-approved"}`,
    }
  },

  verify_receipt: async (input, runId) => {
    const { attached } = input as { attached: boolean }
    return {
      summary: attached ? "Receipt attached" : "No receipt attached",
      artifactType: "expense_check",
      artifactTitle: "Receipt Check",
      artifactContent: attached
        ? "Receipt is attached and valid."
        : "No receipt attached. Requesting from submitter.",
    }
  },

  check_warranty_status: async (input, runId) => {
    const { equipmentId } = input as { equipmentId: string }
    const mockWarranty = { inWarranty: true, expiryDate: "2026-12-31", coverage: "parts_and_labor" }
    return {
      summary: `Warranty check for ${equipmentId}: ${mockWarranty.inWarranty ? "In warranty" : "Expired"}`,
      artifactType: "research",
      artifactTitle: `Warranty: ${equipmentId}`,
      artifactContent: JSON.stringify(mockWarranty),
    }
  },

  check_part_inventory: async (input, runId) => {
    const { partId } = input as { partId: string }
    const mockInventory = { inStock: true, quantity: 15, estimatedDelivery: "2 days" }
    return {
      summary: `Inventory check for ${partId}: ${mockInventory.inStock ? `${mockInventory.quantity} in stock` : "Backordered"}`,
      artifactType: "research",
      artifactTitle: `Inventory: ${partId}`,
      artifactContent: JSON.stringify(mockInventory),
    }
  },

  order_parts: async (input, runId) => {
    const { part, quantity } = input as { part: string; quantity: number }
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`
    return {
      summary: `Order placed: ${quantity}x ${part} (${orderNumber})`,
      artifactType: "note",
      artifactTitle: `Order: ${part}`,
      artifactContent: `Part: ${part}\nQuantity: ${quantity}\nOrder #: ${orderNumber}\nStatus: Placed\nETA: 2-3 days`,
    }
  },

  assess_recall_severity: async (input, runId) => {
    const { text } = input as { text: string }
    const isUrgent = text.toLowerCase().includes("urgent") || text.toLowerCase().includes("safety")
    return {
      summary: `Severity assessment: ${isUrgent ? "CRITICAL" : "Standard"}`,
      artifactType: "research",
      artifactTitle: "Recall Severity Assessment",
      artifactContent: JSON.stringify({
        severity: isUrgent ? "critical" : "standard",
        requiresImmediateAction: isUrgent,
        recommendedWindow: isUrgent ? "24 hours" : "30 days",
      }),
    }
  },

  notify_customer: async (input, runId) => {
    const { customer, subject, message } = input as {
      customer: string; subject: string; message: string
    }
    return {
      summary: `Notification drafted for ${customer}: ${subject}`,
      artifactType: "email_draft",
      artifactTitle: `Notify: ${customer}`,
      artifactContent: `To: ${customer}\nSubject: ${subject}\n\n${message}`,
    }
  },

  execute_recall: async (input, runId) => {
    const { equipmentId, partsUsed } = input as { equipmentId: string; partsUsed?: string[] }
    return {
      summary: `Recall executed for ${equipmentId}`,
      artifactType: "note",
      artifactTitle: `Recall: ${equipmentId}`,
      artifactContent: JSON.stringify({
        equipmentId,
        partsUsed: partsUsed || [],
        status: "completed",
        date: new Date().toISOString(),
      }),
    }
  },

  schedule_visit: async (input, runId) => {
    const { customer, reason, preference } = input as {
      customer?: string; reason: string; preference?: string
    }
    return {
      summary: `Visit scheduled: ${reason}${preference ? ` (${preference})` : ""}`,
      artifactType: "note",
      artifactTitle: `Visit: ${reason}`,
      artifactContent: JSON.stringify({
        customer: customer || "Acme Dental",
        reason,
        preference: preference || "first_available",
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        status: "scheduled",
      }),
    }
  },
}

export default toolHandlers
