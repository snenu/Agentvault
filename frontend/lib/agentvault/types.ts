export type AgentRisk = "low" | "medium" | "high"

export type SecretResource =
  | "github"
  | "aws"
  | "openai"
  | "stripe"
  | "mongodb"
  | "cloudinary"

export type RequestStatus = "approved" | "needs_approval" | "denied" | "revoked"

export type AgentProfile = {
  id: string
  name: string
  did: string
  role: string
  risk: AgentRisk
  lastSeen: string
  status: "verified" | "watching" | "blocked"
}

export type VaultSecret = {
  id: SecretResource
  label: string
  provider: string
  fingerprint: string
  rotation: string
  storedIn: string
  host: string
}

export type PolicyRule = {
  id: string
  agentId: string
  resource: SecretResource
  allowed: boolean
  requiresApproval: boolean
  ttlMinutes: number
  scopes: string[]
  allowedHosts: string[]
  terminalFunction: string
}

export type AuditEvent = {
  id: string
  time: string
  createdAt?: string
  actor: string
  action: string
  resource: string
  status: RequestStatus | "verified" | "sealed" | "executed"
  txHash: string
}

export type AccessRequestInput = {
  agentId: string
  resource: SecretResource
  purpose: string
  humanApproved?: boolean
}

export type IssuedCredential = {
  id: string
  reference: string
  agentId: string
  resource: SecretResource
  status: RequestStatus
  expiresAt: string | null
  ttlSeconds: number
  scopes: string[]
  terminal3: {
    did: string
    scriptName: string
    functionName: string
    allowedHosts: string[]
    sealedMap: string
    mode: "live" | "demo"
  }
  audit: AuditEvent[]
  reason: string
}
