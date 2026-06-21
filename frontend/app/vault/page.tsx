import { KeyRound, LockKeyhole } from "lucide-react"
import { PageShell } from "@/components/agentvault/page-shell"
import { vaultSecrets } from "@/lib/agentvault/data"

export default function VaultPage() {
  return (
    <PageShell
      title="Sealed secret inventory."
      description="Secrets are organized by provider, policy surface, host grant, rotation target, and Terminal3 sealed-map location."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {vaultSecrets.map((secret) => (
          <div key={secret.id} className="rounded-2xl border border-black/[0.07] bg-white/75 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 text-black/45">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-light">{secret.label}</h2>
                  <p className="text-sm text-black/35">{secret.provider}</p>
                </div>
              </div>
              <LockKeyhole className="h-5 w-5 text-emerald-600/70" />
            </div>
            <div className="mt-6 grid gap-3 rounded-xl border border-black/[0.06] bg-black/[0.025] p-4 font-mono text-xs text-black/55">
              <div>fingerprint: {secret.fingerprint}</div>
              <div>stored_in: {secret.storedIn}</div>
              <div>allowed_host: {secret.host}</div>
              <div>rotation: {secret.rotation}</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
