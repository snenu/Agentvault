"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { ArrowRight, EyeOff, KeyRound, LockKeyhole, ScrollText, ShieldCheck, TimerReset } from "lucide-react"
import { IntroAnimation, HERO_REVEAL_MS } from "@/components/intro-animation"
import { MobileNav } from "@/components/mobile-nav"
import { PixelIcon } from "@/components/pixel-icon"
import { RevealText } from "@/components/reveal-text"
import { VaultConsole } from "@/components/agentvault/vault-console"
import { StatusChip } from "@/components/agentvault/status-chip"
import { agentProfiles, policyRules, vaultSecrets } from "@/lib/agentvault/data"

function Capability({
  icon,
  title,
  text,
  delay,
}: {
  icon: ReactNode
  title: string
  text: string
  delay: number
}) {
  return (
    <div
      className="rounded-2xl border border-black/[0.07] bg-white/75 p-7 transition duration-500 hover:-translate-y-1 hover:border-black/15"
      style={{ animation: `fade-up 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 text-black/55">{icon}</div>
      <h3 className="text-lg font-light text-[#111]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-black/45">{text}</p>
    </div>
  )
}

export default function HomePage() {
  const [heroReady, setHeroReady] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const handleIntroDone = useCallback(() => setHeroReady(true), [])

  useEffect(() => {
    const revealTimer = setTimeout(() => setHeroReady(true), HERO_REVEAL_MS)
    const mediaTimer = setTimeout(() => setMediaReady(true), HERO_REVEAL_MS)
    return () => {
      clearTimeout(revealTimer)
      clearTimeout(mediaTimer)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#F5F4F0] text-[#111] antialiased">
      <IntroAnimation onDone={handleIntroDone} />
      <MobileNav />

      <section className="relative min-h-screen overflow-hidden">
        <img
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src="/images/arc.png"
          style={{
            transform: mediaReady ? "scale(1.05)" : "scale(0.86)",
            transition: "transform 2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 z-10 h-[70%] bg-gradient-to-t from-[#F5F4F0] via-[#F5F4F0]/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-[42%] backdrop-blur-md [mask-image:linear-gradient(to_top,black,transparent)]" />

        <div className="relative z-20 flex min-h-screen flex-col justify-end px-6 pb-12 pt-28 md:px-12 lg:px-20">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <h1
                className="max-w-3xl text-6xl font-light leading-[0.98] tracking-tight text-[#111] sm:text-7xl lg:text-8xl"
                style={{
                  opacity: heroReady ? 1 : 0,
                  filter: heroReady ? "blur(0px)" : "blur(24px)",
                  transform: heroReady ? "translateY(0px)" : "translateY(32px)",
                  transition: "opacity 1s cubic-bezier(0.16,1,0.3,1), filter 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                AgentVault<br />protects secrets<br />from AI agents.
              </h1>
              <p
                className="mt-7 max-w-xl text-base leading-7 text-black/50"
                style={{
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0px)" : "translateY(18px)",
                  transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 160ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 160ms",
                }}
              >
                A Terminal3-powered vault for agent identity, delegated policy, sealed secrets, temporary credential references, and auditability.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#111] px-5 text-xs font-medium tracking-[0.16em] text-white transition hover:bg-[#333]">
                  LAUNCH CONSOLE <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/terminal3" className="inline-flex h-12 items-center rounded-xl border border-black/10 bg-white/55 px-5 text-xs tracking-[0.16em] text-black/60 backdrop-blur-md transition hover:border-black/20 hover:text-black">
                  TERMINAL3 FLOW
                </a>
              </div>
            </div>

            <div
              className="rounded-2xl border border-black/[0.08] bg-white/70 p-4 shadow-2xl shadow-black/10 backdrop-blur-2xl"
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? "translateY(0px)" : "translateY(52px)",
                transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 240ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) 240ms",
              }}
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <span className="font-mono text-[11px] text-black/35">agentvault / request-console</span>
                <StatusChip tone="green">Terminal3 verified</StatusChip>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Agents" value="4" />
                <MiniMetric label="Policies" value="5" />
                <MiniMetric label="Secrets" value="6" />
              </div>
              <div className="mt-4 rounded-xl bg-[#111] p-4 font-mono text-xs leading-6 text-white/70">
                <div>agent_did: did:t3n:748c...44e</div>
                <div>contract: z:&lt;tid&gt;:agentvault-contracts</div>
                <div>sealed_map: z:&lt;tid&gt;:secrets</div>
                <div>issued_ref: av_tmp_41d9ac9b7e</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="px-6 py-28 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <PixelIcon type="platform" size={40} />
            <RevealText className="mt-5 text-4xl font-light leading-[1.05] tracking-tight md:text-5xl">
              {"A secure middle layer\nbetween agents and secrets."}
            </RevealText>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Capability icon={<ShieldCheck className="h-5 w-5" />} title="Agent identity" text="Every request is bound to a Terminal3 DID instead of a fragile app session." delay={0} />
            <Capability icon={<LockKeyhole className="h-5 w-5" />} title="Sealed vault" text="Secrets are modeled for TEE access through z:<tid>:secrets, not leaked into prompts." delay={80} />
            <Capability icon={<TimerReset className="h-5 w-5" />} title="Temporary access" text="Agents receive expiring credential references with narrow scopes and host grants." delay={160} />
            <Capability icon={<ScrollText className="h-5 w-5" />} title="Audit ledger" text="Every verification, approval, issue, use, and revoke event is recorded." delay={240} />
          </div>
        </div>
      </section>

      <section className="border-t border-black/[0.06] px-6 py-28 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <VaultConsole agents={agentProfiles} secrets={vaultSecrets} />
        </div>
      </section>

      <section className="border-t border-black/[0.06] px-6 py-28 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <PixelIcon type="workflow" size={40} />
            <RevealText className="mt-5 text-4xl font-light leading-[1.05] tracking-tight md:text-5xl">
              {"Terminal3 is in\nthe critical path."}
            </RevealText>
            <p className="mt-6 text-sm leading-6 text-black/45">
              AgentVault uses Terminal3 for encrypted sessions, tenant-scoped data, contract registration, outbound host grants, and agent-auth delegation.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ["01", "T3nClient opens an encrypted session and authenticates with the configured API key."],
              ["02", "TenantClient manages z:<tid>:secrets and contract lifecycle for AgentVault."],
              ["03", "Users authorize agent DID, contract functions, and allowed outbound hosts with agent-auth-update."],
              ["04", "Contracts return temporary references while sensitive values stay sealed inside the TEE flow."],
            ].map(([number, text]) => (
              <div key={number} className="flex gap-5 rounded-2xl border border-black/[0.07] bg-white/70 p-5">
                <span className="font-mono text-xs text-black/30">{number}</span>
                <p className="text-sm leading-6 text-black/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/[0.06] px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-3">
          <Summary title="Active agents" value={agentProfiles.length.toString()} icon={<EyeOff className="h-5 w-5" />} />
          <Summary title="Vaulted secrets" value={vaultSecrets.length.toString()} icon={<KeyRound className="h-5 w-5" />} />
          <Summary title="Policy rules" value={policyRules.length.toString()} icon={<ShieldCheck className="h-5 w-5" />} />
        </div>
      </section>

      <footer className="border-t border-black/[0.06] px-6 py-10 md:px-12 lg:px-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <span className="font-pixel text-xs tracking-[0.25em] text-black/50">AGENTVAULT</span>
          <div className="flex flex-wrap gap-6 text-xs tracking-widest text-black/30">
            <a href="/vault" className="hover:text-black/60">Vault</a>
            <a href="/agents" className="hover:text-black/60">Agents</a>
            <a href="/policies" className="hover:text-black/60">Policies</a>
            <a href="/logs" className="hover:text-black/60">Logs</a>
            <a href="/terminal3" className="hover:text-black/60">Terminal3</a>
          </div>
          <span className="text-xs text-black/20">© 2026 AgentVault</span>
        </div>
      </footer>
    </main>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-black/30">{label}</p>
      <p className="mt-2 text-2xl font-light">{value}</p>
    </div>
  )
}

function Summary({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/70 p-7">
      <div className="text-black/35">{icon}</div>
      <p className="mt-6 text-4xl font-light">{value}</p>
      <p className="mt-2 text-sm text-black/45">{title}</p>
    </div>
  )
}
