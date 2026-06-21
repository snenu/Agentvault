import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import type { SecretResource } from "./types"

export const SESSION_COOKIE = "agentvault_session"

const SESSION_SCOPE = "agentvault-console"
const APPROVAL_SCOPE = "agentvault-approval"
const SESSION_TTL_SECONDS = 60 * 60 * 2
const APPROVAL_TTL_SECONDS = 60 * 10

type ConsoleSessionMode = "demo" | "operator"

export type ConsoleSession = {
  sid: string
  mode: ConsoleSessionMode
  expiresAt: string
}

type SignedSessionPayload = {
  v: 1
  scope: typeof SESSION_SCOPE
  sid: string
  mode: ConsoleSessionMode
  iat: number
  exp: number
}

type SignedApprovalPayload = {
  v: 1
  scope: typeof APPROVAL_SCOPE
  sid: string
  agentId: string
  resource: SecretResource
  purposeHash: string
  iat: number
  exp: number
}

type AccessResult =
  | { ok: true; session: ConsoleSession }
  | { ok: false; response: NextResponse }

type RateLimitBucket = {
  count: number
  resetAt: number
}

const globalSecurity = globalThis as typeof globalThis & {
  __agentvaultRateLimits?: Map<string, RateLimitBucket>
}

function signingSecret() {
  return (
    process.env.AGENTVAULT_SERVER_SECRET ||
    process.env.AGENTVAULT_OPERATOR_TOKEN ||
    process.env.T3N_API_KEY ||
    "agentvault-local-development-secret"
  )
}

function encodedJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T
}

function signPayload(payload: unknown) {
  const body = encodedJson(payload)
  const signature = createHmac("sha256", signingSecret()).update(body).digest("base64url")
  return `${body}.${signature}`
}

function verifySignedPayload<T>(token: string, expectedScope: string): T | null {
  const [body, signature] = token.split(".")
  if (!body || !signature) return null

  const expected = createHmac("sha256", signingSecret()).update(body).digest("base64url")
  const supplied = Buffer.from(signature)
  const valid = Buffer.from(expected)

  if (supplied.length !== valid.length || !timingSafeEqual(supplied, valid)) return null

  try {
    const payload = decodeJson<T & { scope?: string; exp?: number }>(body)
    if (payload.scope !== expectedScope) return null
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload as T
  } catch {
    return null
  }
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie")
  if (!cookie) return null

  for (const entry of cookie.split(";")) {
    const [key, ...rest] = entry.trim().split("=")
    if (key === name) return rest.join("=")
  }

  return null
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim()
  return request.headers.get("x-agentvault-operator")?.trim() || null
}

export function operatorTokenConfigured() {
  return Boolean(process.env.AGENTVAULT_OPERATOR_TOKEN)
}

export function strictOperatorMode() {
  return process.env.AGENTVAULT_REQUIRE_OPERATOR_TOKEN === "true" || process.env.AGENTVAULT_DEMO_MODE === "false"
}

export function publicDemoSessionsEnabled() {
  return process.env.AGENTVAULT_ENABLE_PUBLIC_DEMO_SESSION !== "false"
}

export function verifyOperatorToken(token?: string | null) {
  const expected = process.env.AGENTVAULT_OPERATOR_TOKEN
  if (!expected || !token) return false

  const suppliedHash = createHash("sha256").update(token).digest()
  const expectedHash = createHash("sha256").update(expected).digest()
  return timingSafeEqual(suppliedHash, expectedHash)
}

export function createConsoleSession(mode: ConsoleSessionMode): { token: string; session: ConsoleSession; maxAge: number } {
  const now = Math.floor(Date.now() / 1000)
  const payload: SignedSessionPayload = {
    v: 1,
    scope: SESSION_SCOPE,
    sid: randomUUID(),
    mode,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }

  return {
    token: signPayload(payload),
    session: {
      sid: payload.sid,
      mode: payload.mode,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    },
    maxAge: SESSION_TTL_SECONDS,
  }
}

export function setConsoleSessionCookie(response: NextResponse, token: string, maxAge: number) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || process.env.AGENTVAULT_SECURE_COOKIES === "true",
    path: "/",
    maxAge,
  })
}

export function verifyConsoleAccess(request: Request): AccessResult {
  if (verifyOperatorToken(bearerToken(request))) {
    return {
      ok: true,
      session: {
        sid: "operator",
        mode: "operator",
        expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
      },
    }
  }

  const token = request.headers.get("x-agentvault-session") || readCookie(request, SESSION_COOKIE)
  const payload = token ? verifySignedPayload<SignedSessionPayload>(token, SESSION_SCOPE) : null

  if (payload) {
    if (strictOperatorMode() && payload.mode !== "operator") {
      return {
        ok: false,
        response: authResponse("Operator session required for live mode.", 401, true),
      }
    }

    return {
      ok: true,
      session: {
        sid: payload.sid,
        mode: payload.mode,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      },
    }
  }

  return {
    ok: false,
    response: authResponse("AgentVault console session required.", 401, strictOperatorMode()),
  }
}

export function authResponse(message: string, status = 401, requiresOperatorToken = false) {
  return NextResponse.json(
    {
      error: message,
      requiresOperatorToken,
    },
    { status },
  )
}

export function rateLimit(request: Request, action: string, limit = 60, windowMs = 60_000) {
  if (!globalSecurity.__agentvaultRateLimits) globalSecurity.__agentvaultRateLimits = new Map()

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  const key = `${action}:${ip}`
  const now = Date.now()
  const current = globalSecurity.__agentvaultRateLimits.get(key)

  if (!current || current.resetAt <= now) {
    globalSecurity.__agentvaultRateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  current.count += 1
  if (current.count <= limit) return null

  return NextResponse.json(
    {
      error: "Too many requests. Wait a minute and retry.",
      resetAt: new Date(current.resetAt).toISOString(),
    },
    { status: 429 },
  )
}

function purposeHash(purpose: string) {
  return createHash("sha256").update(purpose.trim()).digest("base64url")
}

export function createApprovalToken(input: {
  sessionId: string
  agentId: string
  resource: SecretResource
  purpose: string
}) {
  const now = Math.floor(Date.now() / 1000)
  const payload: SignedApprovalPayload = {
    v: 1,
    scope: APPROVAL_SCOPE,
    sid: input.sessionId,
    agentId: input.agentId,
    resource: input.resource,
    purposeHash: purposeHash(input.purpose),
    iat: now,
    exp: now + APPROVAL_TTL_SECONDS,
  }

  return {
    token: signPayload(payload),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

export function verifyApprovalToken(
  token: string | undefined,
  input: { sessionId: string; agentId: string; resource: SecretResource; purpose: string },
) {
  if (!token) return false

  const payload = verifySignedPayload<SignedApprovalPayload>(token, APPROVAL_SCOPE)
  if (!payload) return false

  return (
    payload.sid === input.sessionId &&
    payload.agentId === input.agentId &&
    payload.resource === input.resource &&
    payload.purposeHash === purposeHash(input.purpose)
  )
}
