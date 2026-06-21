"use client"

export type ConsoleSessionResponse = {
  session: {
    sid: string
    mode: "demo" | "operator"
    expiresAt: string
  }
  mode: "demo" | "operator"
  terminal3Mode: "demo" | "live"
}

export async function startConsoleSession(operatorToken?: string) {
  const response = await fetch("/api/agentvault/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operatorToken ? { operatorToken } : {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || "AgentVault session could not be started.") as Error & {
      requiresOperatorToken?: boolean
    }
    error.requiresOperatorToken = Boolean(payload.requiresOperatorToken)
    throw error
  }

  return payload as ConsoleSessionResponse
}

export async function createApprovalAttestation(input: {
  agentId: string
  resource: string
  purpose: string
}) {
  const response = await fetch("/api/agentvault/approval", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || "Approval attestation failed.")
  return payload as { approvalToken: string | null; expiresAt: string | null; reason?: string }
}
