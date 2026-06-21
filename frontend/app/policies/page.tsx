import { PageShell } from "@/components/agentvault/page-shell"
import { StatusChip } from "@/components/agentvault/status-chip"
import { policyRules } from "@/lib/agentvault/data"

export default function PoliciesPage() {
  return (
    <PageShell
      title="Policy engine."
      description="Rules map agent identities to resource scopes, approval requirements, TTL limits, Terminal3 contract functions, and allowed outbound hosts."
    >
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white/75">
        <div className="grid grid-cols-[1fr_1fr_0.7fr_0.8fr] border-b border-black/[0.06] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-black/35">
          <span>Agent</span>
          <span>Resource</span>
          <span>Approval</span>
          <span>TTL</span>
        </div>
        {policyRules.map((rule) => (
          <div key={rule.id} className="grid gap-4 border-b border-black/[0.05] px-5 py-5 last:border-b-0 md:grid-cols-[1fr_1fr_0.7fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm text-black/70">{rule.agentId}</p>
              <p className="mt-1 font-mono text-xs text-black/35">{rule.terminalFunction}</p>
            </div>
            <div>
              <p className="text-sm text-black/70">{rule.resource}</p>
              <p className="mt-1 truncate font-mono text-xs text-black/35">{rule.allowedHosts.join(", ") || "none"}</p>
            </div>
            <StatusChip tone={!rule.allowed ? "red" : rule.requiresApproval ? "amber" : "green"}>
              {!rule.allowed ? "denied" : rule.requiresApproval ? "required" : "auto"}
            </StatusChip>
            <p className="font-mono text-sm text-black/55">{rule.ttlMinutes ? `${rule.ttlMinutes} min` : "0"}</p>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
