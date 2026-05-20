import { NextRequest, NextResponse } from "next/server"
import * as queries from "@/data/queries"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const visit = await queries.getVisitWithRuns(id)
    if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 })
    return NextResponse.json(visit)
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch visit" }, { status: 500 })
  }
}
