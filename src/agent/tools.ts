import type Anthropic from "@anthropic-ai/sdk"

export const draftEmail: Anthropic.Messages.Tool = {
  name: "draft_email",
  description: "Draft an email to a customer or contact. The draft will be queued for human approval before sending.",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject line" },
      body: { type: "string", description: "Email body text" },
      context: { type: "string", description: "Visit context that prompted this email" },
    },
    required: ["to", "subject", "body"],
  },
}

export const researchQuestion: Anthropic.Messages.Tool = {
  name: "research_question",
  description: "Research an open question from a sales visit using available knowledge.",
  input_schema: {
    type: "object",
    properties: {
      question: { type: "string", description: "The question to research" },
      context: { type: "string", description: "Relevant customer or visit details" },
    },
    required: ["question"],
  },
}

export const createFollowupTask: Anthropic.Messages.Tool = {
  name: "create_followup_task",
  description: "Create a follow-up task for the sales rep to complete.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Task description" },
      dueBy: { type: "string", description: "Due date (ISO 8601)" },
      requiresApproval: { type: "boolean", description: "Whether this needs human approval" },
    },
    required: ["title"],
  },
}

export const checkExpense: Anthropic.Messages.Tool = {
  name: "check_expense",
  description: "Check if an expense item is covered by policy.",
  input_schema: {
    type: "object",
    properties: {
      amount: { type: "number", description: "Amount in USD" },
      merchant: { type: "string", description: "Merchant name" },
      category: {
        type: "string",
        enum: ["travel", "meals", "supplies", "entertainment", "other"],
        description: "Expense category",
      },
      purpose: { type: "string", description: "Business purpose" },
    },
    required: ["amount", "merchant", "category", "purpose"],
  },
}

export const generateProposalOutline: Anthropic.Messages.Tool = {
  name: "generate_proposal_outline",
  description: "Generate a proposal outline based on visit outcomes.",
  input_schema: {
    type: "object",
    properties: {
      customerName: { type: "string", description: "Customer name" },
      products: { type: "array", items: { type: "string" }, description: "Products discussed" },
      keyPoints: { type: "array", items: { type: "string" }, description: "Key points to include" },
    },
    required: ["customerName", "products", "keyPoints"],
  },
}

export const tools = [
  draftEmail,
  researchQuestion,
  createFollowupTask,
  checkExpense,
  generateProposalOutline,
]
