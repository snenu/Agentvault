import { PageShell } from "@/components/agentvault/page-shell"
import { StatusChip } from "@/components/agentvault/status-chip"
import { listAuditEvents } from "@/lib/agentvault/audit-store"

export const dynamic = "force-dynamic"

export default async function LogsPage() {
  const events = await listAuditEvents()

  return (
    <PageShell
      title="Audit ledger."
      description="The audit view records identity checks, policy decisions, approvals, credential issue events, revocations, and Terminal3 execution traces."
    >
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="grid gap-4 rounded-2xl border border-black/[0.07] bg-white/75 p-5 md:grid-cols-[0.4fr_0.8fr_1.2fr_0.6fr] md:items-center">
            <p className="font-mono text-xs text-black/35">{event.time}</p>
            <p className="text-sm text-black/55">{event.actor}</p>
            <div>
              <p className="text-sm text-black/70">{event.action}</p>
              <p className="mt-1 truncate font-mono text-xs text-black/35">{event.txHash}</p>
            </div>
            <StatusChip tone={event.status === "denied" ? "red" : event.status === "needs_approval" ? "amber" : "green"}>{event.status}</StatusChip>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
