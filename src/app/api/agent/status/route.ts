import { NextRequest, NextResponse } from "next/server"
import * as queries from "@/data/queries"

export async function GET(request: NextRequest) {
  try {
    const visitId = request.nextUrl.searchParams.get("visitId")
    if (!visitId) return NextResponse.json({ error: "visitId query param required" }, { status: 400 })

    const visit = await queries.getVisitWithRuns(visitId)
    if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 })

    return NextResponse.json(visit)
  } catch (err) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}
