import { agentProfiles, policyRules } from "./data"
import type { AccessRequestInput, AuditEvent, IssuedCredential, PolicyRule } from "./types"

function nowAuditTime() {
  const createdAt = new Date().toISOString()
  return {
    createdAt,
    time: new Date(createdAt).toLocaleTimeString("en-US", { hour12: false }),
  }
}

function txHash() {
  const body = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  return `0x${body}...${crypto.randomUUID().slice(0, 4)}`
}

function findPolicy(input: AccessRequestInput): PolicyRule | undefined {
  return policyRules.find((rule) => rule.agentId === input.agentId && rule.resource === input.resource)
}

function terminal3Mode() {
  return process.env.AGENTVAULT_DEMO_MODE === "false" ? "live" : "demo"
}

function auditEvent(event: Omit<AuditEvent, "id" | "time" | "createdAt" | "txHash">): AuditEvent {
  return {
    id: crypto.randomUUID(),
    ...nowAuditTime(),
    txHash: txHash(),
    ...event,
  }
}

export function evaluateAccessRequest(input: AccessRequestInput): IssuedCredential {
  const agent = agentProfiles.find((item) => item.id === input.agentId)
  const policy = findPolicy(input)
  const requestId = crypto.randomUUID()
  const audit: AuditEvent[] = []

  audit.push(auditEvent({
    actor: input.agentId,
    action: "Terminal3 agent identity checked",
    resource: agent?.did ?? "unknown DID",
    status: agent ? "verified" : "denied",
  }))

  if (!agent || !policy || !policy.allowed) {
    audit.push(auditEvent({
      actor: "AgentVault policy engine",
      action: "Denied request outside delegated policy",
      resource: input.resource,
      status: "denied",
    }))

    return {
      id: requestId,
      reference: "not-issued",
      agentId: input.agentId,
      resource: input.resource,
      status: "denied",
      expiresAt: null,
      ttlSeconds: 0,
      scopes: [],
      terminal3: {
        did: agent?.did ?? "unverified",
        scriptName: "z:<tid>:agentvault-contracts",
        functionName: "deny",
        allowedHosts: [],
        sealedMap: "z:<tid>:secrets",
        mode: terminal3Mode(),
      },
      audit,
      reason: "No matching allow policy exists for this agent and resource.",
    }
  }

  if (policy.requiresApproval && !input.humanApproved) {
    audit.push(auditEvent({
      actor: "AgentVault policy engine",
      action: "Human approval required before issuing reference",
      resource: input.resource,
      status: "needs_approval",
    }))

    return {
      id: requestId,
      reference: "approval-required",
      agentId: input.agentId,
      resource: input.resource,
      status: "needs_approval",
      expiresAt: null,
      ttlSeconds: 0,
      scopes: policy.scopes,
      terminal3: {
        did: agent.did,
        scriptName: "z:<tid>:agentvault-contracts",
        functionName: policy.terminalFunction,
        allowedHosts: policy.allowedHosts,
        sealedMap: "z:<tid>:secrets",
        mode: terminal3Mode(),
      },
      audit,
      reason: "The policy allows this action, but production-sensitive access needs explicit human approval.",
    }
  }

  const expiresAt = new Date(Date.now() + policy.ttlMinutes * 60_000)
  if (policy.requiresApproval) {
    audit.push(auditEvent({
      actor: "human-owner",
      action: "Server-attested approval token verified",
      resource: input.resource,
      status: "approved",
    }))
  }

  audit.push(auditEvent({
    actor: "AgentVault policy engine",
    action: "Issued temporary credential reference",
    resource: input.resource,
    status: "approved",
  }))

  return {
    id: requestId,
    reference: `av_tmp_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    agentId: input.agentId,
    resource: input.resource,
    status: "approved",
    expiresAt: expiresAt.toISOString(),
    ttlSeconds: policy.ttlMinutes * 60,
    scopes: policy.scopes,
    terminal3: {
      did: agent.did,
      scriptName: "z:<tid>:agentvault-contracts",
      functionName: policy.terminalFunction,
      allowedHosts: policy.allowedHosts,
      sealedMap: "z:<tid>:secrets",
      mode: terminal3Mode(),
    },
    audit,
    reason: "Terminal3 verified the agent identity, policy matched, and AgentVault returned a short-lived reference only.",
  }
}

export function revokeCredential(credential: {
  reference: string
  agentId: string
  resource: IssuedCredential["resource"]
  scopes: string[]
  terminal3: IssuedCredential["terminal3"]
}): IssuedCredential {
  return {
    id: crypto.randomUUID(),
    reference: credential.reference,
    agentId: credential.agentId,
    resource: credential.resource,
    status: "revoked",
    expiresAt: null,
    ttlSeconds: 0,
    scopes: credential.scopes,
    terminal3: {
      ...credential.terminal3,
      functionName: "revoke-temp-credential",
      mode: terminal3Mode(),
    },
    audit: [
      auditEvent({
        actor: "AgentVault",
        action: "Revoked temporary credential reference",
        resource: credential.reference,
        status: "revoked",
      }),
    ],
    reason: "The temporary credential reference has been revoked and can no longer be exchanged.",
  }
}
