import Anthropic from "@anthropic-ai/sdk"

const ANTHROPIC_API_KEY = process.env.CROFAI_API_KEY || process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  throw new Error("CROFAI_API_KEY or ANTHROPIC_API_KEY is required")
}

const BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://anthropic.nahcrof.com"
const MODEL = process.env.ANTHROPIC_MODEL || "glm-5.1"

export const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  baseURL: BASE_URL,
})

export async function sendMessage(options: {
  system?: string
  messages: Anthropic.Messages.MessageParam[]
  tools?: Anthropic.Messages.Tool[]
  maxTokens?: number
}) {
  return anthropic.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
  })
}
