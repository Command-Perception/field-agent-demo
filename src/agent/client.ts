import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages"

let anthropic: Anthropic | null = null

function getClient(): Anthropic {
  if (anthropic) return anthropic
  const apiKey = process.env.CROFAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("CROFAI_API_KEY or ANTHROPIC_API_KEY is required")
  }
  const baseURL = process.env.ANTHROPIC_BASE_URL || "https://anthropic.nahcrof.com"
  anthropic = new Anthropic({ apiKey, baseURL })
  return anthropic
}

const MODEL = process.env.ANTHROPIC_MODEL || "glm-5.1"

export async function sendMessage(options: {
  system?: string
  messages: MessageParam[]
  tools?: Tool[]
  maxTokens?: number
}) {
  return getClient().messages.create({
    model: MODEL,
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
  })
}
