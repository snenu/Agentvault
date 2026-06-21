import { NextResponse } from "next/server"
import { rateLimit, verifyConsoleAccess } from "@/lib/agentvault/security"
import { terminal3SeedSecretPlan } from "@/lib/terminal3/client"

export async function POST(request: Request) {
  const access = verifyConsoleAccess(request)
  if (!access.ok) return access.response

  const limited = rateLimit(request, "seed-plan", 20)
  if (limited) return limited

  const body = (await request.json()) as { key?: string }
  const plan = await terminal3SeedSecretPlan(body.key || "github_token")
  return NextResponse.json(plan)
}
