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
}

export default toolHandlers
