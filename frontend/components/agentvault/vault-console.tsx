"use client"

import { useMemo, useState } from "react"
import { useEffect } from "react"
import type { ReactElement } from "react"
import { CheckCircle2, Clock3, KeyRound, LockKeyhole, RotateCcw, ShieldCheck, Terminal, XCircle } from "lucide-react"
import { createApprovalAttestation, startConsoleSession } from "@/lib/agentvault/console-session-client"
import type { AgentProfile, IssuedCredential, SecretResource, VaultSecret } from "@/lib/agentvault/types"
import { StatusChip } from "./status-chip"

type ConsoleProps = {
  agents: AgentProfile[]
  secrets: VaultSecret[]
}

type RequestBody = {
  agentId: string
  resource: SecretResource
  purpose: string
  approvalToken?: string
}

type SessionState = "checking" | "ready" | "needs_operator" | "error"

export function VaultConsole({ agents, secrets }: ConsoleProps) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "coding-agent")
  const [resource, setResource] = useState<SecretResource>("github")
  const [purpose, setPurpose] = useState("Push signed release branch and open a pull request")
  const [humanApproved, setHumanApproved] = useState(false)
  const [result, setResult] = useState<IssuedCredential | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sessionState, setSessionState] = useState<SessionState>("checking")
  const [sessionMode, setSessionMode] = useState<"demo" | "operator" | null>(null)
  const [operatorToken, setOperatorToken] = useState("")

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === agentId), [agents, agentId])
  const selectedSecret = useMemo(() => secrets.find((secret) => secret.id === resource), [secrets, resource])

  async function openSession(token?: string) {
    setError("")
    setSessionState("checking")
    try {
      const session = await startConsoleSession(token)
      setSessionMode(session.mode)
      setSessionState("ready")
      if (token) setOperatorToken("")
    } catch (sessionError) {
      const typed = sessionError as Error & { requiresOperatorToken?: boolean }
      setSessionState(typed.requiresOperatorToken ? "needs_operator" : "error")
      setError(typed.message)
    }
  }

  useEffect(() => {
    openSession()
  }, [])

  async function requestAccess() {
    setLoading(true)
    setError("")
    try {
      let approvalToken: string | undefined
      if (humanApproved) {
        const approval = await createApprovalAttestation({ agentId, resource, purpose })
        approvalToken = approval.approvalToken || undefined
      }

      const body: RequestBody = { agentId, resource, purpose, approvalToken }
      const response = await fetch("/api/vault/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Request failed")
      setResult(payload)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    if (!result?.reference || result.reference === "approval-required" || result.reference === "not-issued") return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/vault/revoke", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: result.reference }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Revoke failed")
      setResult(payload)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Revoke failed")
    } finally {
      setLoading(false)
    }
  }

  const approved = result?.status === "approved"
  const denied = result?.status === "denied"
  const approvalNeeded = result?.status === "needs_approval"
  const displayAllowedHosts = result?.terminal3.allowedHosts ?? (selectedSecret ? [selectedSecret.host] : [])
  const sessionReady = sessionState === "ready"

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-black/[0.07] bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/35">
              <LockKeyhole className="h-3.5 w-3.5" />
              Protected Action
            </div>
            <h2 className="mt-3 text-3xl font-light tracking-tight text-[#111]">Issue a temporary credential</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/45">
              Agents request a resource, Terminal3 verifies identity, AgentVault evaluates policy, then the app returns an expiring reference.
            </p>
          </div>
          <StatusChip tone={approved ? "green" : approvalNeeded ? "amber" : denied ? "red" : "blue"}>
            {result?.status ? result.status.replace("_", " ") : "ready"}
          </StatusChip>
        </div>

        <div className="mt-5 rounded-xl border border-black/[0.07] bg-black/[0.025] px-4 py-3">
          {sessionState === "needs_operator" ? (
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
                openSession(operatorToken)
              }}
            >
              <input
                type="password"
                value={operatorToken}
                onChange={(event) => setOperatorToken(event.target.value)}
                placeholder="Operator token"
                className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70 outline-none transition focus:border-black/25"
              />
              <button
                type="submit"
                disabled={!operatorToken.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111] px-4 text-xs font-medium tracking-[0.16em] text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
              >
                UNLOCK
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs text-black/45">
              <LockKeyhole className="h-4 w-4" />
              {sessionState === "ready"
                ? `Secured ${sessionMode} console session active`
                : sessionState === "checking"
                  ? "Starting secured console session"
                  : "Console session unavailable"}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-black/35">Agent identity</span>
            <select
              suppressHydrationWarning
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70 outline-none transition focus:border-black/25"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-black/35">Secret resource</span>
            <select
              suppressHydrationWarning
              value={resource}
              onChange={(event) => setResource(event.target.value as SecretResource)}
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70 outline-none transition focus:border-black/25"
            >
              {secrets.map((secret) => (
                <option key={secret.id} value={secret.id}>
                  {secret.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-black/35">Purpose</span>
            <textarea
              suppressHydrationWarning
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="min-h-24 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 text-black/70 outline-none transition focus:border-black/25"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm text-black/55">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={humanApproved}
              onChange={(event) => setHumanApproved(event.target.checked)}
              className="h-4 w-4 accent-black"
            />
            Human approval attached for high-risk resources
          </label>
          <div className="flex gap-2">
            <button
              onClick={requestAccess}
              disabled={loading || !sessionReady}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#111] px-5 text-xs font-medium tracking-[0.16em] text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? "RUNNING" : "REQUEST"}
            </button>
            <button
              onClick={revoke}
              disabled={!approved || loading || !sessionReady}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 px-4 text-xs tracking-[0.16em] text-black/55 transition hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              REVOKE
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-black/[0.07] bg-[#111] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/45">
            <Terminal className="h-3.5 w-3.5" />
            Terminal3 Flow
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.16em] text-white/45">
            {result?.terminal3.mode ?? "demo"}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <InfoRow icon={<ShieldCheck />} label="Agent DID" value={selectedAgent?.did ?? "unknown"} />
          <InfoRow icon={<KeyRound />} label="Vault secret" value={selectedSecret?.fingerprint ?? "unknown"} />
          <InfoRow icon={<LockKeyhole />} label="Sealed map" value={result?.terminal3.sealedMap ?? "z:<tid>:secrets"} />
          <InfoRow icon={<Clock3 />} label="TTL" value={result?.ttlSeconds ? `${Math.round(result.ttlSeconds / 60)} minutes` : "waiting"} />
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 font-mono text-xs leading-6 text-white/65">
          <div>script_name: {result?.terminal3.scriptName ?? "z:<tid>:agentvault-contracts"}</div>
          <div>function_name: {result?.terminal3.functionName ?? "issue-temp-credential"}</div>
          <div>allowed_hosts: {displayAllowedHosts.filter(Boolean).join(", ")}</div>
          <div>reference: {result?.reference ?? "not issued yet"}</div>
          <div>expires_at: {result?.expiresAt ?? "pending"}</div>
        </div>

        <div className="mt-5 space-y-2">
          {(result?.audit ?? []).map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              {event.status === "denied" ? <XCircle className="mt-0.5 h-4 w-4 text-red-300" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />}
              <div className="min-w-0">
                <p className="truncate text-sm text-white/80">{event.action}</p>
                <p className="mt-0.5 text-[11px] text-white/35">{event.time} · {event.txHash}</p>
              </div>
            </div>
          ))}
          {!result ? <p className="text-sm leading-6 text-white/45">Run a request to see Terminal3 verification, policy evaluation, sealed map access, and ledger events.</p> : null}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-white/35">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">{label}</p>
        <p className="mt-1 truncate font-mono text-xs text-white/70">{value}</p>
      </div>
    </div>
  )
}
