import { NextResponse } from "next/server"
import {
  authResponse,
  createConsoleSession,
  operatorTokenConfigured,
  publicDemoSessionsEnabled,
  rateLimit,
  setConsoleSessionCookie,
  strictOperatorMode,
  verifyOperatorToken,
} from "@/lib/agentvault/security"

export const dynamic = "force-dynamic"

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim()
  return request.headers.get("x-agentvault-operator")?.trim() || null
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "session", 30)
  if (limited) return limited

  const body = (await request.json().catch(() => ({}))) as { operatorToken?: string }
  const suppliedOperatorToken = bearerToken(request) || body.operatorToken || null
  const strict = strictOperatorMode()

  if (strict || suppliedOperatorToken) {
    if (!operatorTokenConfigured()) {
      return authResponse("AGENTVAULT_OPERATOR_TOKEN must be configured before enabling strict operator mode.", 500, true)
    }

    if (!verifyOperatorToken(suppliedOperatorToken)) {
      return authResponse("Invalid AgentVault operator token.", 401, true)
    }

    const { token, session, maxAge } = createConsoleSession("operator")
    const response = NextResponse.json({
      session,
      mode: "operator",
      terminal3Mode: process.env.AGENTVAULT_DEMO_MODE === "false" ? "live" : "demo",
    })
    setConsoleSessionCookie(response, token, maxAge)
    return response
  }

  if (!publicDemoSessionsEnabled()) {
    return authResponse("Public demo sessions are disabled. Enter an operator token.", 401, true)
  }

  const { token, session, maxAge } = createConsoleSession("demo")
  const response = NextResponse.json({
    session,
    mode: "demo",
    terminal3Mode: process.env.AGENTVAULT_DEMO_MODE === "false" ? "live" : "demo",
  })
  setConsoleSessionCookie(response, token, maxAge)
  return response
}
