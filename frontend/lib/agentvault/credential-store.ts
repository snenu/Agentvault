import { getMongoCollection } from "./mongo"
import type { IssuedCredential, RequestStatus, SecretResource } from "./types"

const collectionName = "credential_references"

export type StoredCredential = {
  reference: string
  requestId: string
  agentId: string
  resource: SecretResource
  status: Extract<RequestStatus, "approved" | "revoked">
  issuedAt: string
  expiresAt: string
  ttlSeconds: number
  scopes: string[]
  terminal3: IssuedCredential["terminal3"]
  revokedAt?: string
}

const globalCredentials = globalThis as typeof globalThis & {
  __agentvaultCredentialStore?: Map<string, StoredCredential>
}

function localStore() {
  if (!globalCredentials.__agentvaultCredentialStore) {
    globalCredentials.__agentvaultCredentialStore = new Map()
  }
  return globalCredentials.__agentvaultCredentialStore
}

export async function saveIssuedCredential(credential: IssuedCredential) {
  if (credential.status !== "approved" || !credential.expiresAt || !credential.reference.startsWith("av_tmp_")) return

  const record: StoredCredential = {
    reference: credential.reference,
    requestId: credential.id,
    agentId: credential.agentId,
    resource: credential.resource,
    status: "approved",
    issuedAt: new Date().toISOString(),
    expiresAt: credential.expiresAt,
    ttlSeconds: credential.ttlSeconds,
    scopes: credential.scopes,
    terminal3: credential.terminal3,
  }

  localStore().set(record.reference, record)
  try {
    const collection = await getMongoCollection<StoredCredential>(collectionName)
    if (!collection) return

    await collection.updateOne({ reference: record.reference }, { $setOnInsert: record }, { upsert: true })
  } catch {
    // Credential persistence is best-effort in local/demo mode; the in-memory record remains available.
  }
}

export async function getIssuedCredential(reference: string) {
  const local = localStore().get(reference)
  if (local) return local

  try {
    const collection = await getMongoCollection<StoredCredential>(collectionName)
    if (!collection) return null

    const record = await collection.findOne({ reference }, { projection: { _id: 0 } })
    if (record) localStore().set(reference, record)
    return record
  } catch {
    return null
  }
}

export async function markCredentialRevoked(reference: string) {
  const credential = await getIssuedCredential(reference)
  if (!credential) return { status: "not_found" as const }

  if (credential.status === "revoked") {
    return { status: "already_revoked" as const, credential }
  }

  const revoked: StoredCredential = {
    ...credential,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  }

  localStore().set(reference, revoked)
  try {
    const collection = await getMongoCollection<StoredCredential>(collectionName)
    if (collection) {
      await collection.updateOne({ reference }, { $set: { status: "revoked", revokedAt: revoked.revokedAt } })
    }
  } catch {
    // The local revocation is authoritative for the current runtime if the backing store is unavailable.
  }

  return { status: "revoked" as const, credential: revoked }
}
