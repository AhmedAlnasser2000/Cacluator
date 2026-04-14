# External Compute Lab

This folder now spans two bounded incubation steps:

- `PGL4`: provider-neutral external-compute foundations
- `PGL5`: first real SSH execution pilot on a user-owned VM target
- `PGL5+`: SSH VM hardening before any adoption or provider-host decision

Fixed rules:
- SSH is the only remote transport in scope here.
- Provider APIs and rented-host integrations stay out of scope.
- No stable product/runtime authority lives here.
- Tracked config remains template-only.

Current capabilities:
- provider-neutral runner/job/artifact contracts
- a workload registry with one real Playground workload
- local harness proof from `PGL4`
- one SSH pilot flow in `PGL5` that:
  - uploads JSON inputs
  - runs a dedicated remote Playground entrypoint
  - pulls artifacts back locally
  - compares the remote summary against a local parity baseline
- one hardening path in `PGL5+` that:
  - runs preflight checks before upload
  - records step-level retries, timeouts, provenance, and failure classes
  - exposes one repeatable operator command:
    - `npm run playground:ssh-vm -- --profile <path> --job <path>`

Real operator profiles must live in `profiles/*.local.json` and remain ignored by git.
