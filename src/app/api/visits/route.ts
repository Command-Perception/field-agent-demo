import { NextResponse } from "next/server"
import * as queries from "@/data/queries"

export async function GET() {
  try {
    const visits = await queries.listVisits()
    return NextResponse.json(visits)
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 })
  }
}
