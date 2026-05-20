import { NextRequest, NextResponse } from "next/server"
import { runAgent } from "@/agent/core"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitId } = body
    if (!visitId) return NextResponse.json({ error: "visitId required" }, { status: 400 })

    const result = await runAgent(visitId)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Agent run failed" }, { status: 500 })
  }
}
