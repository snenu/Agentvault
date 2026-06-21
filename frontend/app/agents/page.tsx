import { Bot, ShieldCheck } from "lucide-react"
import { PageShell } from "@/components/agentvault/page-shell"
import { StatusChip } from "@/components/agentvault/status-chip"
import { agentProfiles } from "@/lib/agentvault/data"

const tones = {
  verified: "green",
  watching: "amber",
  blocked: "red",
} as const

export default function AgentsPage() {
  return (
    <PageShell
      title="Verified agent registry."
      description="Every agent has a stable identity, risk profile, permission role, and Terminal3 DID used during protected actions."
    >
      <div className="space-y-3">
        {agentProfiles.map((agent) => (
          <div key={agent.id} className="grid gap-4 rounded-2xl border border-black/[0.07] bg-white/75 p-5 md:grid-cols-[1fr_1.2fr_0.5fr] md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/10 text-black/45">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-light">{agent.name}</h2>
                <p className="text-sm text-black/35">{agent.role}</p>
              </div>
            </div>
            <p className="truncate font-mono text-xs text-black/45">{agent.did}</p>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <StatusChip tone={tones[agent.status]}>{agent.status}</StatusChip>
              <ShieldCheck className="h-5 w-5 text-black/25" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
