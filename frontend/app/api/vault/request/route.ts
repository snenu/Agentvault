import { NextResponse } from "next/server"
import { saveIssuedCredential } from "@/lib/agentvault/credential-store"
import { evaluateAccessRequest } from "@/lib/agentvault/policy-engine"
import { recordAuditEvents } from "@/lib/agentvault/audit-store"
import { rateLimit, verifyApprovalToken, verifyConsoleAccess } from "@/lib/agentvault/security"
import { executeTerminal3VaultContract } from "@/lib/terminal3/client"
import type { AccessRequestInput, SecretResource } from "@/lib/agentvault/types"

const resources = new Set<SecretResource>(["github", "aws", "openai", "stripe", "mongodb", "cloudinary"])

export async function POST(request: Request) {
  try {
    const access = verifyConsoleAccess(request)
    if (!access.ok) return access.response

    const limited = rateLimit(request, "vault-request", 80)
    if (limited) return limited

    const body = (await request.json()) as Partial<AccessRequestInput> & { approvalToken?: string }
    if (!body.agentId || !body.resource || !resources.has(body.resource)) {
      return NextResponse.json({ error: "agentId and valid resource are required." }, { status: 400 })
    }

    const purpose = body.purpose?.trim() || "No purpose supplied"
    const humanApproved = verifyApprovalToken(body.approvalToken, {
      sessionId: access.session.sid,
      agentId: body.agentId,
      resource: body.resource,
      purpose,
    })

    const result = evaluateAccessRequest({
      agentId: body.agentId,
      resource: body.resource,
      purpose,
      humanApproved,
    })

    if (result.status === "approved" && result.terminal3.mode === "live") {
      let live
      try {
        live = await executeTerminal3VaultContract({
          action: "issue",
          functionName: result.terminal3.functionName as "issue-temp-credential" | "proxy-with-placeholders",
          input: {
            agent_did: result.terminal3.did,
            resource: result.resource,
            scopes: result.scopes,
            ttl_seconds: result.ttlSeconds,
          },
        })
      } catch (error) {
        const createdAt = new Date().toISOString()
        const audit = [
          ...result.audit,
          {
            id: crypto.randomUUID(),
            time: new Date(createdAt).toLocaleTimeString("en-US", { hour12: false }),
            createdAt,
            actor: "Terminal3 TEE contract",
            action: "Live contract execution failed; no credential reference issued",
            resource: result.resource,
            status: "denied" as const,
            txHash: "t3n:execution-failed",
          },
        ]
        await recordAuditEvents(audit)

        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Terminal3 live contract execution failed.",
            status: "denied",
            reference: "not-issued",
            audit,
          },
          { status: 502 },
        )
      }

      const liveReference = typeof live.response?.reference === "string" ? live.response.reference : null
      if (liveReference?.startsWith("av_tmp_")) result.reference = liveReference

      result.audit.push({
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString("en-US", { hour12: false }),
        createdAt: new Date().toISOString(),
        actor: "Terminal3 TEE contract",
        action: `Executed ${live.functionName}`,
        resource: live.tail,
        status: "executed",
        txHash: `t3n:${live.version}`,
      })
    }

    await saveIssuedCredential(result)
    await recordAuditEvents(result.audit)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access request failed." },
      { status: 500 },
    )
  }
}
