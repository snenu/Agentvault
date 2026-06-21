import { access, readFile } from "node:fs/promises"
import path from "node:path"
import {
  T3nClient,
  TenantClient,
  createEthAuthInput,
  eth_get_address,
  getNodeUrl,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
} from "@terminal3/t3n-sdk"

const args = new Set(process.argv.slice(2))
const setup = args.has("--setup")
const statusOnly = args.has("--status") || !setup

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function mask(value) {
  if (!value) return "missing"
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : "configured"
}

async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!(await exists(envPath))) return
  const text = await readFile(envPath, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator === -1) continue
    const key = trimmed.slice(0, separator)
    const value = trimmed.slice(separator + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  await loadLocalEnv()
  const env = process.env.T3N_ENVIRONMENT || "testnet"
  setEnvironment(env)

  const apiKey = required("T3N_API_KEY")
  const wasmComponent = await loadWasmComponent()
  const address = eth_get_address(apiKey)
  const t3n = new T3nClient({
    wasmComponent,
    handlers: {
      EthSign: metamask_sign(address, undefined, apiKey),
    },
  })

  await t3n.handshake()
  const did = await t3n.authenticate(createEthAuthInput(address))
  const tenant = new TenantClient({
    t3n,
    baseUrl: getNodeUrl(),
    tenantDid: did.value,
  })

  const summary = {
    environment: env,
    nodeUrl: getNodeUrl(),
    address,
    authenticatedDid: did.value,
    configuredDid: process.env.T3N_DID || "missing",
    apiKey: mask(apiKey),
    registeredContractId: null,
    seededKeys: [],
    notes: [],
  }

  try {
    summary.tenant = await tenant.tenant.me()
  } catch (error) {
    summary.notes.push(`tenant.me skipped: ${error instanceof Error ? error.message : "unknown error"}`)
  }

  if (statusOnly) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const wasmPath =
    process.env.AGENTVAULT_WASM_PATH ||
    path.resolve(process.cwd(), "..", "contracts", "agentvault-tee", "target", "wasm32-wasip2", "release", "agentvault_tee.wasm")

  if (await exists(wasmPath)) {
    const wasm = await readFile(wasmPath)
    const registered = await tenant.contracts.register({
      tail: "agentvault-contracts",
      version: process.env.AGENTVAULT_CONTRACT_VERSION || "0.1.2",
      wasm,
    })
    summary.registeredContractId = registered?.contract_id ?? null
  } else {
    summary.notes.push(`WASM not found at ${wasmPath}; build contracts/agentvault-tee first to register live.`)
  }

  if (summary.registeredContractId) {
    for (const tail of ["secrets", "revocations"]) {
      try {
        await tenant.maps.create({
          tail,
          visibility: "private",
          writers: { only: [summary.registeredContractId] },
          readers: { only: [summary.registeredContractId] },
        })
      } catch (error) {
        summary.notes.push(`${tail} map create skipped: ${error instanceof Error ? error.message : "already exists or unavailable"}`)
      }
    }
  }

  const secretEntries = [
    ["openai_credential", process.env.OPENAI_API_KEY],
    ["mongodb_credential", process.env.MONGODB_URI],
    ["cloudinary_credential", process.env.CLOUDINARY_API_SECRET],
  ].filter((entry) => Boolean(entry[1]))

  for (const [key, value] of secretEntries) {
    await tenant.executeControl("map-entry-set", {
      map_name: tenant.canonicalName("secrets"),
      key,
      value,
    })
    summary.seededKeys.push(key)
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
