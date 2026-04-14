# External Compute SSH VM Hardening and Adoption Gate

## Metadata

- experiment_id: `ext-compute-ssh-vm-hardening`
- title: `External Compute SSH VM Hardening and Adoption Gate`
- owner: `unassigned`
- lane_topic: `external-compute`
- current_level: `level-3-integration-candidates`
- status: `active`
- date_started: `2026-04-14`
- last_reviewed: `2026-04-14`
- next_review: `2026-04-21`
- candidate_stable_home: `future remote execution adapters / orchestration layer`
- companion_manifest: `playground/manifests/ext-compute-ssh-vm-hardening.yaml`

## Hypothesis

- After the successful `PGL5` VM-first SSH pilot, one bounded hardening pass should be enough to answer the pre-adoption question honestly:
  - can the external-compute lane run one real SSH workload with trustworthy operational behavior, clear failure classes, strong provenance, and a repeatable operator flow?

## Why It Matters

- The transport proof now exists; the next uncertainty is operational trust, not whether SSH can run at all.
- This is the smallest useful step before any provider-host expansion or adoption discussion.
- It should tell us whether external compute is close to becoming an integration candidate or still too fragile/noisy to carry forward.

## In Scope

- One user-owned SSH target reached through the `calcwiz-box` host alias.
- One registered workload:
  - `sym-search-planner-ordering`
- A checked-in operator entrypoint:
  - `npm run playground:ssh-vm -- --profile <path> --job <path>`
- Preflight checks before upload:
  - local `ssh` / `scp` availability
  - `ssh -o BatchMode=yes <hostAlias> "echo ok"`
  - remote project path, remote entrypoint, and `vitest.playground.config.ts`
- Step-level timeout handling for preflight, upload, remote run, and pullback.
- One retry on upload and one retry on pullback only.
- Explicit manifest failure classes, provenance, and step results.

## Out Of Scope

- Provider APIs or provider-specific host flows.
- `vast.ai` / `Runpod` integration.
- Multiple workloads.
- Queueing, dashboards, or scheduler behavior.
- Stable app integration or `playground/` imports into `src/`.
- Calculator-visible controls or `PGL-VIS`.

## Operator Note

- Expected target shape:
  - host alias: `calcwiz-box`
  - remote project path: `/home/ahmed/calcwiz-playground/Calculator`
- Expected operator command:
  - `npm run playground:ssh-vm -- --profile playground/level-0-research/external-compute/profiles/calcwiz-box.local.json --job <job-spec-path>`
- Local outputs land under:
  - `.task_tmp/pgl5-external-compute/<jobId>/`
- On failed or cancelled runs:
  - keep the remote `.task_tmp/pgl5-external-compute/<jobId>/` directory for inspection first
  - clean it up manually only after the manifest/parity evidence is no longer needed

## Success Criteria

- One live `calcwiz-box` run still completes with:
  - local manifest `status: completed`
  - parity report `resultClass: match`
- At least two induced failure-path proofs classify correctly:
  - `preflight-failed`
  - `remote-timeout`
- The local SSH manifest records:
  - step results
  - preflight summary
  - local provenance
  - remote provenance
  - remote execution metadata

## Live Result

- The checked-in operator flow now runs successfully through:
  - `npm run playground:ssh-vm -- --profile playground/level-0-research/external-compute/profiles/calcwiz-box.local.json --job <job-spec-path>`
- The live `calcwiz-box` success path completed with:
  - local manifest `status: completed`
  - parity report `resultClass: match`
- Two induced failure-path probes classified correctly:
  - intentionally bad `remoteProjectPath` -> `failureClass: preflight-failed`
  - intentionally tiny `remoteRunTimeoutSeconds` -> `failureClass: remote-timeout`
- The record remains `status: active` because the next decision is still open:
  - provider-host expansion
  - or keeping the VM-first lane internal-only / no-adopt

## Promotion Criteria

- The VM-first SSH flow is reliable enough that the next discussion can be:
  - provider-host expansion
  - no-adopt/retire
  rather than “is the SSH lane still too operationally uncertain?”
- The operator flow no longer depends on a handwritten `.task_tmp` script.
- Failure classes and parity evidence are useful enough to guide an adoption decision.

## Retirement Criteria

- Even after hardening, the SSH lane still creates too much operational noise for too little signal.
- The provenance and failure evidence do not materially improve trust in the remote lane.
- Another bounded external-compute direction clearly supersedes this VM-first hardening pass.
