"use client"

import { useEffect, useState } from "react"
import type { ReactElement } from "react"
import { Activity, DatabaseZap, Fingerprint, Network, ShieldCheck } from "lucide-react"
import { startConsoleSession } from "@/lib/agentvault/console-session-client"
import { StatusChip } from "./status-chip"

type DiagnosticPayload = {
  configured: boolean
  environment: string
  sdkPackage: string
  did: string
  apiKeyFingerprint: string
  nodeUrl?: string
  liveReady: boolean
  contractTail: string
  contractVersion: string
  notes: string[]
  address?: string
  authenticatedDid?: string
  tenantStatus?: unknown
  error?: string
}

export function Terminal3Diagnostics() {
  const [payload, setPayload] = useState<DiagnosticPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionError, setSessionError] = useState("")

  async function load(live = false) {
    setLoading(true)
    setSessionError("")
    try {
      const response = await fetch(`/api/terminal3/status${live ? "?live=1" : ""}`, { credentials: "same-origin" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Terminal3 status failed.")
      setPayload(data)
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Terminal3 status failed.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    startConsoleSession()
      .then(() => load())
      .catch((error: Error & { requiresOperatorToken?: boolean }) => {
        setSessionError(error.requiresOperatorToken ? "Operator token is required to inspect Terminal3 diagnostics." : error.message)
      })
  }, [])

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/75 p-6 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-black/35">
            <Network className="h-3.5 w-3.5" />
            Terminal3 SDK
          </div>
          <h2 className="mt-3 text-3xl font-light tracking-tight">Live readiness</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">
            The app imports `@terminal3/t3n-sdk`, resolves the active testnet node, and can run an encrypted session handshake from the server.
          </p>
        </div>
        <StatusChip tone={payload?.configured ? "green" : "amber"}>
          {payload?.configured ? "configured" : "missing env"}
        </StatusChip>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric icon={<Fingerprint />} label="DID" value={payload?.did ?? "loading"} />
        <Metric icon={<ShieldCheck />} label="API key" value={payload?.apiKeyFingerprint ?? "loading"} />
        <Metric icon={<Activity />} label="Environment" value={payload?.environment ?? "testnet"} />
        <Metric icon={<DatabaseZap />} label="Contract" value={payload ? `${payload.contractTail}@${payload.contractVersion}` : "resolving"} />
      </div>

      {payload?.error ? (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">{payload.error}</div>
      ) : null}
      {sessionError ? (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-800">{sessionError}</div>
      ) : null}

      <div className="mt-5 rounded-xl border border-black/[0.07] bg-black/[0.025] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-black/35">SDK coverage</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-black/55">
          {(payload?.notes ?? []).map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-2 h-1 w-1 rounded-full bg-black/35" />
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => load(false)}
          disabled={loading}
          className="h-11 rounded-xl border border-black/10 px-4 text-xs tracking-[0.16em] text-black/55 transition hover:border-black/20 hover:text-black disabled:opacity-50"
        >
          REFRESH
        </button>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="h-11 rounded-xl bg-[#111] px-5 text-xs font-medium tracking-[0.16em] text-white transition hover:bg-[#333] disabled:opacity-50"
        >
          {loading ? "CHECKING" : "RUN LIVE HANDSHAKE"}
        </button>
      </div>

      {payload?.authenticatedDid ? (
        <div className="mt-5 rounded-xl border border-emerald-600/20 bg-emerald-50 p-4 font-mono text-xs leading-6 text-emerald-800">
          <div>address: {payload.address}</div>
          <div>authenticated_did: {payload.authenticatedDid}</div>
          <div>tenant_status: {JSON.stringify(payload.tenantStatus)}</div>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.07] bg-white p-4">
      <div className="text-black/30">{icon}</div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-black/30">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-black/65">{value}</p>
    </div>
  )
}
