# AgentVault TEE Contract

This folder contains the Terminal3 tenant contract surface that backs AgentVault's protected actions.

It is intentionally small:

- `issue-temp-credential` validates the requested resource/scope envelope and returns only a temporary reference plus the sealed map key name.
- `revoke-temp-credential` returns a revocation confirmation for a temporary reference.
- `proxy-with-placeholders` returns a placeholder-ready proxy plan for calls that need private user profile values resolved by a Terminal3 host flow.

To build for Terminal3:

```bash
rustup target add wasm32-wasip2
cargo +stable-x86_64-pc-windows-gnu build --target wasm32-wasip2 --release
```

Register the compiled `.wasm` with `TenantClient.contracts.register`, create a private `secrets` map with readers/writers restricted to the returned contract ID, and seed values with `tenant.executeControl("map-entry-set", ...)`.

The app setup script does that from `frontend`:

```bash
npm run terminal3:setup
```
