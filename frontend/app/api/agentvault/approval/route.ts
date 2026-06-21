import { NextResponse } from "next/server"
import { policyRules } from "@/lib/agentvault/data"
import { createApprovalToken, rateLimit, verifyConsoleAccess } from "@/lib/agentvault/security"
import type { SecretResource } from "@/lib/agentvault/types"

const resources = new Set<SecretResource>(["github", "aws", "openai", "stripe", "mongodb", "cloudinary"])

export async function POST(request: Request) {
  const access = verifyConsoleAccess(request)
  if (!access.ok) return access.response

  const limited = rateLimit(request, "approval", 40)
  if (limited) return limited

  const body = (await request.json()) as { agentId?: string; resource?: SecretResource; purpose?: string }
  if (!body.agentId || !body.resource || !resources.has(body.resource) || !body.purpose?.trim()) {
    return NextResponse.json({ error: "agentId, resource, and purpose are required for approval." }, { status: 400 })
  }

  const policy = policyRules.find((rule) => rule.agentId === body.agentId && rule.resource === body.resource)
  if (!policy?.allowed) {
    return NextResponse.json({
      approvalToken: null,
      expiresAt: null,
      reason: "No approval token was created because the policy is not allowed.",
    })
  }

  if (!policy.requiresApproval) {
    return NextResponse.json({ approvalToken: null, expiresAt: null, reason: "This policy does not require human approval." })
  }

  const approval = createApprovalToken({
    sessionId: access.session.sid,
    agentId: body.agentId,
    resource: body.resource,
    purpose: body.purpose,
  })

  return NextResponse.json({ approvalToken: approval.token, expiresAt: approval.expiresAt })
}
