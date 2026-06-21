import { NextResponse } from "next/server"
import { markCredentialRevoked } from "@/lib/agentvault/credential-store"
import { revokeCredential } from "@/lib/agentvault/policy-engine"
import { recordAuditEvents } from "@/lib/agentvault/audit-store"
import { rateLimit, verifyConsoleAccess } from "@/lib/agentvault/security"
import { executeTerminal3VaultContract } from "@/lib/terminal3/client"

export async function POST(request: Request) {
  try {
    const access = verifyConsoleAccess(request)
    if (!access.ok) return access.response

    const limited = rateLimit(request, "vault-revoke", 80)
    if (limited) return limited

    const body = (await request.json()) as { reference?: string }
    if (!body.reference || !body.reference.startsWith("av_tmp_")) {
      return NextResponse.json({ error: "A valid temporary reference is required." }, { status: 400 })
    }

    const revoked = await markCredentialRevoked(body.reference)
    if (revoked.status === "not_found") {
      return NextResponse.json({ error: "Temporary reference was not issued by AgentVault." }, { status: 404 })
    }

    if (revoked.credential.terminal3.mode === "live") {
      await executeTerminal3VaultContract({
        action: "revoke",
        functionName: "revoke-temp-credential",
        input: { reference: body.reference },
      })
    }

    const result = revokeCredential(revoked.credential)
    if (revoked.status === "already_revoked") {
      result.reason = "The temporary credential reference was already revoked."
    }

    await recordAuditEvents(result.audit)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Revoke request failed." },
      { status: 500 },
    )
  }
}
