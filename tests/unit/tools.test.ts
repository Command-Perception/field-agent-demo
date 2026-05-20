import { describe, it, expect } from "vitest"
import { tools } from "@/agent/tools"

describe("Agent tools", () => {
  it("defines all 5 tools", () => {
    expect(tools).toHaveLength(5)
  })

  it("each tool has required Anthropic fields", () => {
    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(tool.description).toBeDefined()
      expect(tool.input_schema).toBeDefined()
      expect(tool.input_schema.type).toBe("object")
      expect(Array.isArray(tool.input_schema.required)).toBe(true)
    }
  })

  it("draft_email tool has correct fields", () => {
    const tool = tools.find(t => t.name === "draft_email")!
    expect(tool).toBeDefined()
    expect(tool.input_schema.required).toContain("to")
    expect(tool.input_schema.required).toContain("subject")
    expect(tool.input_schema.required).toContain("body")
  })

  it("check_expense tool has category enum", () => {
    const tool = tools.find(t => t.name === "check_expense")!
    expect(tool).toBeDefined()
    const category = (tool.input_schema.properties as any).category
    expect(category.enum).toContain("travel")
    expect(category.enum).toContain("meals")
  })
})
