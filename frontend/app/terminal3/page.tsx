import { PageShell } from "@/components/agentvault/page-shell"
import { Terminal3Diagnostics } from "@/components/agentvault/terminal3-diagnostics"
import { agentProfiles, vaultSecrets } from "@/lib/agentvault/data"
import { terminal3GrantPayload } from "@/lib/terminal3/client"

export default function Terminal3Page() {
  const grant = terminal3GrantPayload(agentProfiles[0].did, vaultSecrets[0].host, ["issue-temp-credential", "revoke-temp-credential"])

  return (
    <PageShell
      title="Terminal3 integration."
      description="AgentVault treats Terminal3 as the trust boundary: encrypted sessions, DID authentication, tenant maps, TEE contracts, delegation grants, and host-scoped outbound calls."
    >
      <div className="space-y-5">
        <Terminal3Diagnostics />
        <div className="rounded-2xl border border-black/[0.07] bg-[#111] p-6 text-white">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">agent-auth-update payload</p>
          <pre className="mt-4 overflow-auto rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-white/70">
            {JSON.stringify(grant, null, 2)}
          </pre>
        </div>
      </div>
    </PageShell>
  )
}
