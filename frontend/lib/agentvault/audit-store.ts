import { auditEvents } from "./data"
import { getMongoCollection } from "./mongo"
import type { AuditEvent } from "./types"

const collectionName = "audit_events"

const globalAudit = globalThis as typeof globalThis & {
  __agentvaultAuditEvents?: AuditEvent[]
}

function localEvents() {
  if (!globalAudit.__agentvaultAuditEvents) globalAudit.__agentvaultAuditEvents = []
  return globalAudit.__agentvaultAuditEvents
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const local = localEvents()

  try {
    const collection = await getMongoCollection<AuditEvent>(collectionName)
    if (!collection) return [...local, ...auditEvents]

    const rows = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1, time: -1 })
      .limit(40)
      .toArray()
    return rows.length ? rows : [...local, ...auditEvents]
  } catch {
    return [...local, ...auditEvents]
  }
}

export async function recordAuditEvents(events: AuditEvent[]) {
  localEvents().unshift(...events)
  if (events.length === 0) return

  try {
    const collection = await getMongoCollection<AuditEvent>(collectionName)
    if (!collection) return
    await collection.insertMany(events)
  } catch {
    // Audit persistence is best-effort in local/demo mode. The API still returns the event set.
  }
}
