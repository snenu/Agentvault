type Terminal3Readiness = {
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
}

type Terminal3LiveResult = Terminal3Readiness & {
  address?: string
  authenticatedDid?: string
  tenantStatus?: unknown
  error?: string
}

type Terminal3VaultExecution = {
  action: "issue" | "revoke"
  functionName: "issue-temp-credential" | "revoke-temp-credential" | "proxy-with-placeholders"
  input: Record<string, unknown>
}

function mask(value?: string) {
  if (!value) return "missing"
  if (value.length <= 12) return "configured"
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export async function getTerminal3Readiness(): Promise<Terminal3Readiness> {
  const notes = [
    "Uses @terminal3/t3n-sdk with T3nClient, TenantClient, encrypted handshake, and Ethereum auth.",
    "Secrets are modeled as z:<tid>:secrets and written with tenant.executeControl('map-entry-set').",
    "Agent grants are modeled through tee:user/contracts agent-auth-update with allowed functions and hosts.",
  ]

  let nodeUrl: string | undefined
  let sdkPackage = "@terminal3/t3n-sdk"

  try {
    const sdk = await import("@terminal3/t3n-sdk")
    sdk.setEnvironment((process.env.T3N_ENVIRONMENT || "testnet") as "testnet" | "production")
    nodeUrl = sdk.getNodeUrl()
  } catch (error) {
    sdkPackage = `unavailable: ${error instanceof Error ? error.message : "unknown import error"}`
  }

  return {
    configured: Boolean(process.env.T3N_API_KEY && process.env.T3N_DID),
    environment: process.env.T3N_ENVIRONMENT || "testnet",
    sdkPackage,
    did: process.env.T3N_DID || "missing",
    apiKeyFingerprint: mask(process.env.T3N_API_KEY),
    nodeUrl,
    liveReady: process.env.AGENTVAULT_DEMO_MODE === "false",
    contractTail: process.env.AGENTVAULT_CONTRACT_TAIL || "agentvault-contracts",
    contractVersion: process.env.AGENTVAULT_CONTRACT_VERSION || "0.1.2",
    notes,
  }
}

export async function runTerminal3LiveHandshake(): Promise<Terminal3LiveResult> {
  const base = await getTerminal3Readiness()
  if (!process.env.T3N_API_KEY) {
    return { ...base, error: "T3N_API_KEY is not configured." }
  }

  try {
    const sdk = await import("@terminal3/t3n-sdk")
    sdk.setEnvironment((process.env.T3N_ENVIRONMENT || "testnet") as "testnet" | "production")

    const wasmComponent = await sdk.loadWasmComponent()
    const address = sdk.eth_get_address(process.env.T3N_API_KEY)
    const t3n = new sdk.T3nClient({
      wasmComponent,
      handlers: {
        EthSign: sdk.metamask_sign(address, undefined, process.env.T3N_API_KEY),
      },
    })

    await t3n.handshake()
    const did = await t3n.authenticate(sdk.createEthAuthInput(address))
    const tenant = new sdk.TenantClient({
      t3n,
      baseUrl: sdk.getNodeUrl(),
      tenantDid: did.value,
    })

    let tenantStatus: unknown = null
    try {
      tenantStatus = await tenant.tenant.me()
    } catch (error) {
      tenantStatus = {
        warning: error instanceof Error ? error.message : "Tenant record could not be read.",
      }
    }

    return {
      ...base,
      configured: true,
      liveReady: true,
      nodeUrl: sdk.getNodeUrl(),
      address,
      authenticatedDid: did.value,
      tenantStatus,
    }
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : "Terminal3 live handshake failed.",
    }
  }
}

async function createTenantSession() {
  if (!process.env.T3N_API_KEY) throw new Error("T3N_API_KEY is not configured.")

  const sdk = await import("@terminal3/t3n-sdk")
  sdk.setEnvironment((process.env.T3N_ENVIRONMENT || "testnet") as "testnet" | "production")

  const wasmComponent = await sdk.loadWasmComponent()
  const address = sdk.eth_get_address(process.env.T3N_API_KEY)
  const t3n = new sdk.T3nClient({
    wasmComponent,
    handlers: {
      EthSign: sdk.metamask_sign(address, undefined, process.env.T3N_API_KEY),
    },
  })

  await t3n.handshake()
  const did = await t3n.authenticate(sdk.createEthAuthInput(address))
  const tenant = new sdk.TenantClient({
    t3n,
    baseUrl: sdk.getNodeUrl(),
    tenantDid: did.value,
  })

  return { sdk, t3n, tenant, did: did.value, address }
}

function bytesForContract(input: Record<string, unknown>) {
  return Array.from(Buffer.from(JSON.stringify(input), "utf8"))
}

function decodeContractResponse(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return { raw }
    }
  }

  if (Array.isArray(raw) && raw.every((item) => Number.isInteger(item))) {
    try {
      return JSON.parse(Buffer.from(raw as number[]).toString("utf8")) as Record<string, unknown>
    } catch {
      return { raw }
    }
  }

  if (raw instanceof Uint8Array) {
    try {
      return JSON.parse(Buffer.from(raw).toString("utf8")) as Record<string, unknown>
    } catch {
      return { raw: Array.from(raw) }
    }
  }

  if (typeof raw === "object") return raw as Record<string, unknown>
  return null
}

export async function executeTerminal3VaultContract(execution: Terminal3VaultExecution) {
  const { tenant, did } = await createTenantSession()
  const tail = process.env.AGENTVAULT_CONTRACT_TAIL || "agentvault-contracts"
  const version = process.env.AGENTVAULT_CONTRACT_VERSION || "0.1.2"

  const raw = await tenant.contracts.execute(tail, {
    version,
    functionName: execution.functionName,
    input: bytesForContract(execution.input),
  })

  return {
    did,
    tail,
    version,
    functionName: execution.functionName,
    response: decodeContractResponse(raw),
  }
}

export async function terminal3SeedSecretPlan(secretKey: string) {
  const sdk = await import("@terminal3/t3n-sdk")
  sdk.setEnvironment((process.env.T3N_ENVIRONMENT || "testnet") as "testnet" | "production")

  return {
    mapName: "z:<tid>:secrets",
    controlCall: "tenant.executeControl('map-entry-set', { map_name: tenant.canonicalName('secrets'), key, value })",
    key: secretKey,
    nodeUrl: sdk.getNodeUrl(),
  }
}

export function terminal3GrantPayload(agentDid: string, resourceHost: string, functions: string[]) {
  return {
    script_name: "tee:user/contracts",
    function_name: "agent-auth-update",
    input: {
      agents: [
        {
          agentDid,
          scripts: [
            {
              scriptName: "z:<tid>:agentvault-contracts",
              versionReq: "latest",
              functions,
              allowedHosts: [resourceHost],
            },
          ],
        },
      ],
    },
  }
}
