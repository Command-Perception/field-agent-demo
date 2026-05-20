import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  mockGetVisit: vi.fn(),
  mockCreateRun: vi.fn(),
  mockAddTask: vi.fn(),
  mockUpdateTaskState: vi.fn(),
  mockUpdateRunStatus: vi.fn(),
  mockAddArtifact: vi.fn(),
  mockGetVisitWithRuns: vi.fn(),
  mockSendMessage: vi.fn(),
  mockGetReadyAgentTasks: vi.fn(),
  mockQuery: vi.fn(),
}))

vi.mock("@/data/db", () => ({ query: mocks.mockQuery }))
vi.mock("@/data/queries", () => ({
  getVisit: mocks.mockGetVisit,
  createRun: mocks.mockCreateRun,
  addTask: mocks.mockAddTask,
  updateTaskState: mocks.mockUpdateTaskState,
  updateRunStatus: mocks.mockUpdateRunStatus,
  addArtifact: mocks.mockAddArtifact,
  getVisitWithRuns: mocks.mockGetVisitWithRuns,
  getReadyAgentTasks: mocks.mockGetReadyAgentTasks,
}))
vi.mock("@/agent/client", () => ({ sendMessage: mocks.mockSendMessage }))

import { runAgent } from "@/agent/core"

describe("Task state classification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGetVisit.mockResolvedValue({ id: "visit-1", account_name: "Test", subject: "Test", notes: "" })
    mocks.mockCreateRun.mockResolvedValue({ id: "run-1" })
    mocks.mockAddTask.mockReturnValue({ id: "task-1" })
    mocks.mockUpdateTaskState.mockResolvedValue(undefined)
    mocks.mockAddArtifact.mockResolvedValue({ id: "art-1" })
    mocks.mockGetVisitWithRuns.mockResolvedValue({ id: "visit-1" })
    mocks.mockGetReadyAgentTasks.mockResolvedValue([])
    mocks.mockQuery.mockResolvedValue([])
  })

  it("classifies agent tasks as ready_to_run", async () => {
    mocks.mockSendMessage.mockResolvedValue({
      content: [{ type: "text", text: `<result>{"extracted":[{"type":"action","description":"Research competitor pricing","classification":"agent"}],"summary":"test"}</result>` }],
    })

    await runAgent("visit-1")

    const agentTask = mocks.mockAddTask.mock.calls.find((c: any) => c[1]?.title === "Research competitor pricing")
    expect(agentTask).toBeTruthy()
    expect(agentTask[1].state).toBe("ready_to_run")
  })

  it("classifies human tasks as pending_human", async () => {
    mocks.mockSendMessage.mockResolvedValue({
      content: [{ type: "text", text: `<result>{"extracted":[{"type":"risk","description":"Customer concerned about pricing","classification":"human"}],"summary":"test"}</result>` }],
    })

    await runAgent("visit-1")

    const humanTask = mocks.mockAddTask.mock.calls.find((c: any) => c[1]?.title === "Customer concerned about pricing")
    expect(humanTask).toBeTruthy()
    expect(humanTask[1].state).toBe("pending_human")
  })

  it("handles malformed JSON gracefully", () => {
    const content = "Some plain text without result tags"
    const match = content.match(/<result>([\s\S]*?)<\/result>/)
    expect(match).toBeNull()
  })
})
