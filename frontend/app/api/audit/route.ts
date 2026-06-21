import { NextResponse } from "next/server"
import { listAuditEvents } from "@/lib/agentvault/audit-store"
import { rateLimit, verifyConsoleAccess } from "@/lib/agentvault/security"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const access = verifyConsoleAccess(request)
  if (!access.ok) return access.response

  const limited = rateLimit(request, "audit", 80)
  if (limited) return limited

  const events = await listAuditEvents()
  return NextResponse.json({ events })
}
