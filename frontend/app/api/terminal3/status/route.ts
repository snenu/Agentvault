import { NextResponse } from "next/server"
import { rateLimit, verifyConsoleAccess } from "@/lib/agentvault/security"
import { getTerminal3Readiness, runTerminal3LiveHandshake } from "@/lib/terminal3/client"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const access = verifyConsoleAccess(request)
  if (!access.ok) return access.response

  const url = new URL(request.url)
  const live = url.searchParams.get("live") === "1"
  const limited = rateLimit(request, live ? "terminal3-live" : "terminal3-status", live ? 10 : 60)
  if (limited) return limited

  const result = live ? await runTerminal3LiveHandshake() : await getTerminal3Readiness()
  return NextResponse.json(result)
}
