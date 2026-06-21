import { VaultConsole } from "@/components/agentvault/vault-console"
import { PageShell } from "@/components/agentvault/page-shell"
import { StatusChip } from "@/components/agentvault/status-chip"
import { agentProfiles, auditEvents, vaultSecrets } from "@/lib/agentvault/data"

export default function DashboardPage() {
  return (
    <PageShell
      title="Agent access command center."
      description="Run the full AgentVault flow: verify agent identity, evaluate policy, attach approval when needed, issue a temporary reference, and revoke it."
    >
      <div className="space-y-5">
        <VaultConsole agents={agentProfiles} secrets={vaultSecrets} />
        <div className="grid gap-3 md:grid-cols-3">
          {auditEvents.slice(0, 3).map((event) => (
            <div key={event.id} className="rounded-2xl border border-black/[0.07] bg-white/75 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-black/35">{event.time}</p>
                <StatusChip tone={event.status === "approved" || event.status === "verified" ? "green" : "amber"}>{event.status}</StatusChip>
              </div>
              <p className="mt-5 text-sm text-black/65">{event.action}</p>
              <p className="mt-2 truncate font-mono text-xs text-black/35">{event.txHash}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
