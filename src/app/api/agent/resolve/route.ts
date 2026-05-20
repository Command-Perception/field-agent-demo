import { NextRequest, NextResponse } from "next/server"
import { resolveHITL } from "@/agent/core"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { runId, taskId, approved, feedback } = body

    if (!runId || !taskId || approved === undefined) {
      return NextResponse.json({ error: "runId, taskId, and approved required" }, { status: 400 })
    }

    const result = await resolveHITL(runId, taskId, approved, feedback)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Resolution failed" }, { status: 500 })
  }
}
