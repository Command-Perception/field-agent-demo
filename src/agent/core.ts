import { sendMessage } from "./client"
import { tools } from "./tools"
import toolHandlers from "./toolHandlers"
import type { VisitContext, ExtractedItem } from "./types"
import * as queries from "../data/queries"
import { query } from "../data/db"
import { emit } from "../server/wsManager"

const EXTRACT_SYSTEM_PROMPT = `You are a sales visit follow-up agent. Your job is to:
1. Review the visit context (notes, outcomes, account info)
2. Extract open questions, commitments, risks, action items, and dates mentioned
3. Plan a set of follow-up tasks

For each extracted item, classify it as:
- "agent": can be done autonomously (research, template fill, draft)
- "human": requires the sales rep's input (confirm facts, answer questions, upload receipts)
- "approval": needs human review before sending (email drafts, customer-facing docs)

Return your analysis as valid JSON inside <result> tags with this shape:
<result>
{
  "extracted": [
    {
      "type": "question" | "commitment" | "risk" | "action" | "date",
      "description": "what was said or implied",
      "classification": "agent" | "human" | "approval"
    }
  ],
  "summary": "one-sentence summary of what needs to happen"
}
</result>`

const ACT_SYSTEM_PROMPT = `You are a sales follow-up agent executing autonomous tasks.
Use the available tools to complete the task. You may call one or more tools.
After receiving tool results, summarize what was done.

You have these tools available:
- draft_email: Draft emails for customer follow-up
- research_question: Research open questions
- create_followup_task: Create additional follow-up tasks
- check_expense: Check expense policy compliance
- generate_proposal_outline: Generate proposal outlines`

export async function runAgent(visitId: string) {
  const visit = await queries.getVisit(visitId)
  if (!visit) throw new Error(`Visit ${visitId} not found`)

  const run = await queries.createRun(visitId)
  emit("phase", { runId: run.id, phase: "ingest", status: "started", visitId })

  const analysisTask = await queries.addTask(run.id, {
    type: "agent",
    title: "Ingest and analyze visit context",
    description: "Extract open questions, commitments, risks, action items",
    state: "ready_to_run",
  })

  try {
    emit("phase", { runId: run.id, phase: "extract", status: "started", visitId })
    const response = await sendMessage({
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Visit ID: ${visit.id}
Account: ${visit.account_name}${visit.account_industry ? ` (${visit.account_industry})` : ""}
Subject: ${visit.subject}
Notes: ${visit.notes || "(none)"}
Outcomes: ${visit.outcomes || "(none)"}
Owner: ${visit.owner_alias || "(unassigned)"}`,
        },
      ],
    })

    const content = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")

    emit("phase", { runId: run.id, phase: "extract", status: "complete", visitId })

    await queries.updateTaskState(run.id, analysisTask.id, "done", { analysis: content })

    await queries.addArtifact(run.id, {
      type: "analysis",
      title: `Visit analysis - ${visit.account_name}`,
      content,
    })
    emit("artifact", { runId: run.id, type: "analysis" })

    emit("phase", { runId: run.id, phase: "plan", status: "started", visitId })

    const extraction = extractJSON(content)
    if (extraction?.extracted) {
      for (const item of extraction.extracted) {
        const taskType = item.classification === "approval" ? "approval" : item.classification === "human" ? "human" : "agent"
        const taskState = item.classification === "agent" ? "ready_to_run" : "pending_human"
        const task = await queries.addTask(run.id, {
          type: taskType,
          title: item.description,
          description: `Extracted from visit: ${item.type}`,
          state: taskState,
          details: { extractedType: item.type },
        })
        emit("task", { runId: run.id, task })
      }

      if (extraction.summary) {
        await queries.updateRunStatus(run.id, "waiting_on_human")
      }
    }

    emit("phase", { runId: run.id, phase: "plan", status: "complete", visitId })

    emit("phase", { runId: run.id, phase: "act", status: "started", visitId })
    await executeAgentTasks(run.id)
    emit("phase", { runId: run.id, phase: "act", status: "complete", visitId })

    const result = await queries.getVisitWithRuns(visitId)
    emit("run_complete", { runId: run.id, visitId })
    return result
  } catch (err) {
    await queries.updateRunStatus(run.id, "failed")
    await queries.addArtifact(run.id, {
      type: "note",
      title: "Error",
      content: err instanceof Error ? err.message : "Unknown error",
    })
    emit("run_complete", { runId: run.id, visitId, error: true })
    return await queries.getVisitWithRuns(visitId)
  }
}

export async function executeAgentTasks(runId: string) {
  const tasks = await queries.getReadyAgentTasks(runId)
  if (tasks.length === 0) return

  for (const task of tasks) {
    try {
      const response = await sendMessage({
        system: ACT_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Execute the following task:\n\nTitle: ${task.title}\nDescription: ${task.description || "N/A"}\n\nUse the available tools to complete this task.`,
        }],
        tools,
        maxTokens: 2048,
      })

      const textParts: string[] = []
      const toolCalls: Array<{ name: string; input: Record<string, unknown>; id: string }> = []

      for (const block of response.content) {
        if (block.type === "text") textParts.push(block.text)
        if (block.type === "tool_use") toolCalls.push({
          name: block.name,
          input: block.input as Record<string, unknown>,
          id: block.id,
        })
      }

        const toolResults: Array<{ summary: string }> = []

      for (const toolCall of toolCalls) {
        const handler = toolHandlers[toolCall.name]
        if (handler) {
          const result = await handler(toolCall.input, runId)
          toolResults.push(result)

          const artifact = await queries.addArtifact(runId, {
            type: result.artifactType as any,
            title: result.artifactTitle,
            content: result.artifactContent,
          })
          emit("artifact", { runId, artifact })

          if (result.followupTasks) {
            for (const ft of result.followupTasks) {
              const ftask = await queries.addTask(runId, {
                type: ft.type,
                title: ft.title,
                description: ft.description,
                state: ft.state,
              })
              emit("task", { runId, task: ftask })
            }
          }
        }
      }

      const resultSummary = [
        ...textParts,
        ...toolResults.map((r) => r.summary),
      ].join("\n")

      await queries.updateTaskState(runId, task.id, "done", {
        toolsCalled: toolCalls.map((t) => t.name),
        resultSummary,
        toolResults,
      })
      emit("task_done", { runId, taskId: task.id })
    } catch (err) {
      await queries.updateTaskState(runId, task.id, "done", {
        error: err instanceof Error ? err.message : "Tool execution failed",
      })
      emit("task_done", { runId, taskId: task.id, error: true })
    }
  }

  const pendingCount = await checkPendingTasks(runId)
  if (pendingCount === 0) {
    await queries.updateRunStatus(runId, "completed")
    emit("status", { runId, status: "completed" })
  } else {
    await queries.updateRunStatus(runId, "waiting_on_human")
    emit("status", { runId, status: "waiting_on_human" })
  }
}

export async function resolveHITL(runId: string, taskId: string, approved: boolean, feedback?: string) {
  const run = await query("SELECT * FROM agent_runs WHERE id = $1", [runId])
  if (!run[0]) throw new Error("Run not found")

  const tasks = await query("SELECT * FROM agent_tasks WHERE id = $1 AND run_id = $2", [taskId, runId])
  if (!tasks[0]) throw new Error("Task not found")
  if (tasks[0].state !== "pending_human") throw new Error("Task is not pending human input")

  if (approved) {
    emit("phase", { runId, phase: "act", status: "resumed", taskId })
    if (tasks[0].type === "approval") {
      await queries.updateTaskState(runId, taskId, "done", { approved: true, feedback })
      const newTask = await queries.addTask(runId, {
        type: "agent",
        title: `Execute: ${tasks[0].title}`,
        description: tasks[0].description,
        state: "ready_to_run",
        details: { feedback, parentTaskId: taskId },
      })
      emit("task", { runId, task: newTask })
      await executeAgentTasks(runId)
    } else {
      await queries.updateTaskState(runId, taskId, "done", { approved: true, feedback })
      const agentTask = await queries.addTask(runId, {
        type: "agent",
        title: `Handle: ${tasks[0].title}`,
        description: tasks[0].description,
        state: "ready_to_run",
        details: { feedback, parentTaskId: taskId },
      })
      emit("task", { runId, task: agentTask })
      await executeAgentTasks(runId)
    }
  } else {
    await queries.updateTaskState(runId, taskId, "done", { approved: false, feedback })
    const artifact = await queries.addArtifact(runId, {
      type: "note",
      title: `Rejected: ${tasks[0].title}`,
      content: feedback || "No reason given",
    })
    emit("artifact", { runId, artifact })
  }

  const pendingCount = await checkPendingTasks(runId)
  if (pendingCount === 0) {
    await queries.updateRunStatus(runId, "completed")
    emit("status", { runId, status: "completed" })
  } else {
    const runData = await query("SELECT * FROM agent_runs WHERE id = $1", [runId])
    if (runData[0]?.status !== "running") {
      await queries.updateRunStatus(runId, "waiting_on_human")
      emit("status", { runId, status: "waiting_on_human" })
    }
  }

  return await queries.getVisitWithRuns(
    (await query("SELECT visit_id FROM agent_runs WHERE id = $1", [runId]))[0].visit_id
  )
}

async function checkPendingTasks(runId: string): Promise<number> {
  const rows = await query(
    "SELECT COUNT(*) as c FROM agent_tasks WHERE run_id = $1 AND state = 'pending_human'",
    [runId]
  )
  return parseInt(rows[0]?.c || "0", 10)
}

function extractJSON(text: string): { extracted: ExtractedItem[]; summary: string } | null {
  const match = text.match(/<result>([\s\S]*?)<\/result>/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}
