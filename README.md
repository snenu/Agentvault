# AgentVault

AgentVault is a secure secret manager and access-control console for AI agents. It lets an agent request a protected resource, verifies the Terminal3 identity path, evaluates policy, optionally requires human approval, issues a short-lived `av_tmp_*` reference, records audit events, and revokes the reference when access is no longer needed.

The app is built for the Terminal3 Agent Auth SDK challenge: it demonstrates agent identity, tenant authentication, protected contract registration, private tenant maps, agent grant payloads, approval attestation, and revocation workflows without exposing permanent API keys to the agent runtime.

## Live App

Production frontend:

```text
https://agentvault-t3.vercel.app
https://agentvault-terminal3.vercel.app
```
 

## What It Does

- Starts a signed AgentVault console session before protected actions.
- Rejects unauthenticated vault request and revoke calls.
- Models agents, protected resources, policies, scopes, TTLs, and approval requirements.
- Issues temporary credential references instead of returning raw secrets.
- Requires server-signed approval tokens for high-risk resources.
- Persists issued references and audit events to MongoDB when available.
- Falls back to in-memory persistence when MongoDB is unreachable, with short timeouts so demos keep working.
- Shows separate pages for dashboard, vault inventory, agents, policies, logs, and Terminal3 diagnostics.
- Runs a live Terminal3 encrypted handshake and tenant status check from the diagnostics page.

## Terminal3 Integration

The Terminal3 SDK integration is in `frontend/lib/terminal3/client.ts` and `frontend/scripts/terminal3-setup.mjs`.

Implemented SDK coverage:

- `setEnvironment("testnet")`
- `loadWasmComponent()`
- `eth_get_address()`
- `metamask_sign()`
- `createEthAuthInput()`
- `T3nClient.handshake()`
- `T3nClient.authenticate()`
- `TenantClient`
- `tenant.tenant.me()`
- `tenant.maps.create()`
- `tenant.contracts.register()`
- `tenant.contracts.execute()` in live mode
- `tenant.executeControl("map-entry-set", ...)`
- `tee:user/contracts` `agent-auth-update` grant payload generation

The current contract package is `z:agentvault@0.1.2`, registered as:

```text
agentvault-contracts@0.1.2
latest setup contract id: 419
```

Seeded Terminal3 map keys:

```text
openai_credential
mongodb_credential
cloudinary_credential
```

The app defaults to demo issuance mode so the public product flow remains fully usable. If `AGENTVAULT_DEMO_MODE=false`, approved requests attempt direct `tenant.contracts.execute(...)` calls against the registered Terminal3 contract and fail closed if Terminal3 execution errors. During final QA, Terminal3 handshake and tenant auth worked, while direct contract execution returned a Terminal3 node `500`, so live issuance should stay disabled until that node/ABI issue is resolved.

## TEE Contract

The contract lives in `contracts/agentvault-tee`.

Exported functions:

- `issue-temp-credential`
- `revoke-temp-credential`
- `proxy-with-placeholders`

Build and test with the GNU Rust toolchain on Windows:

```bash
cd contracts/agentvault-tee
cargo +stable-x86_64-pc-windows-gnu test
cargo +stable-x86_64-pc-windows-gnu build --target wasm32-wasip2 --release
```

## Project Structure

```text
AgentVault/
+-- contracts/
|   +-- agentvault-tee/          # Terminal3 WIT + Rust WASI p2 contract
+-- frontend/
|   +-- app/                     # Next routes and API routes
|   +-- components/agentvault/   # AgentVault UI components
|   +-- lib/agentvault/          # Policy, sessions, audit, credential store
|   +-- lib/terminal3/           # Terminal3 SDK wrapper
|   +-- public/                  # AgentVault icon, manifest, local images
|   +-- scripts/terminal3-setup.mjs
+-- project.md
+-- README.md
```

## Environment

Copy `frontend/.env.example` to `frontend/.env.local` for local development. Do not commit `.env.local`.

Required for Terminal3:

```env
T3N_ENVIRONMENT=testnet
T3N_API_KEY=
T3N_DID=
AGENTVAULT_CONTRACT_TAIL=agentvault-contracts
AGENTVAULT_CONTRACT_VERSION=0.1.2
```

Recommended app settings:

```env
AGENTVAULT_DEMO_MODE=true
AGENTVAULT_SERVER_SECRET=
AGENTVAULT_OPERATOR_TOKEN=
AGENTVAULT_REQUIRE_OPERATOR_TOKEN=false
AGENTVAULT_ENABLE_PUBLIC_DEMO_SESSION=true
AGENTVAULT_SECURE_COOKIES=true
MONGODB_URI=
OPENAI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

For local HTTP testing, omit `AGENTVAULT_SECURE_COOKIES` or set it to `false`; Vercel sets secure cookies in production.

## Local Development

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

Open:

```text
http://localhost:3001
```

Production-style local run:

```bash
cd frontend
npm run build
npm run start -- --port 3012
```

## API Routes

- `POST /api/agentvault/session` creates a signed console session.
- `POST /api/agentvault/approval` creates a short-lived approval attestation.
- `POST /api/vault/request` evaluates policy and returns `approved`, `denied`, or `needs_approval`.
- `POST /api/vault/revoke` revokes an issued `av_tmp_*` reference.
- `GET /api/audit` returns MongoDB-backed audit events with in-memory fallback.
- `GET /api/terminal3/status` returns SDK readiness and masked configuration.
- `GET /api/terminal3/status?live=1` runs a live Terminal3 handshake/auth check.
- `POST /api/terminal3/seed-plan` returns the sealed-map seed plan.

## Terminal3 Setup

After building the WASM contract:

```bash
cd frontend
npm run terminal3:setup
```

Status check:

```bash
cd frontend
npm run terminal3:status
```

The setup script masks key material in output. It registers the contract when the WASM file exists, creates private `secrets` and `revocations` maps when possible, and seeds configured secret values into the `secrets` map.

## Deployment

Deploy on Vercel from `frontend`:

```bash
cd frontend
vercel --prod --yes
```

Set the variables from `frontend/.env.example` in Vercel. Keep `AGENTVAULT_DEMO_MODE=true` for the current public deployment unless live Terminal3 contract execution has been confirmed healthy.

## Verification

Final local checks run on June 21, 2026:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm audit --omit=dev`
- `npm run terminal3:status`
- `cargo +stable-x86_64-pc-windows-gnu test`
- `cargo +stable-x86_64-pc-windows-gnu build --target wasm32-wasip2 --release`
- Playwright production smoke test at `http://127.0.0.1:3012`

Playwright verified:

- home page renders on desktop and mobile
- unauthenticated request/revoke API calls return `401`
- denied policy path returns `denied`
- approval-required path returns `needs_approval`
- approved path returns a real `av_tmp_*` reference
- revoke path returns `revoked`
- fake authenticated revoke returns `404`
- Terminal3 diagnostics show `agentvault-contracts@0.1.2`
- live Terminal3 handshake shows authenticated DID
- no Next error overlay
- no browser console errors or warnings

Production smoke test also passed against `https://agentvault-t3.vercel.app` after the Vercel deployment:

- signed demo session created over HTTPS
- approved deploy-agent AWS request returned an `av_tmp_*` reference
- revoke returned `revoked`
- Terminal3 live handshake rendered authenticated DID
- desktop and mobile pages rendered without console issues

 