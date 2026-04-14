# External Compute SSH VM Pilot With Artifact Pullback

## Metadata

- experiment_id: `ext-compute-ssh-vm-pilot`
- title: `External Compute SSH VM Pilot With Artifact Pullback`
- owner: `unassigned`
- lane_topic: `external-compute`
- current_level: `level-2-bounded-prototypes`
- status: `active`
- date_started: `2026-04-14`
- last_reviewed: `2026-04-14`
- next_review: `2026-04-21`
- candidate_stable_home: `future remote execution adapters / orchestration layer`
- companion_manifest: `playground/manifests/ext-compute-ssh-vm-pilot.yaml`

## Hypothesis

- The `PGL4` SSH foundations contract is now strong enough to support one real bounded remote run on a user-owned VM, with pulled-back artifacts and a parity report against a fresh local baseline, without introducing provider-specific complexity.

## Why It Matters

- This is the smallest honest step beyond foundations:
  - a real SSH target
  - one real workload
  - explicit pullback and parity
- It tests remote execution mechanics without hiding behind far-away provider latency, cost, or lifecycle issues.
- It should answer whether the current external-compute contract is useful enough to carry forward into later provider-host work.

## In Scope

- One user-owned SSH target reached through the `calcwiz-box` host alias.
- One registered workload:
  - `sym-search-planner-ordering`
- Uploading JSON job/profile inputs to the remote repo.
- Running one dedicated remote Playground entrypoint.
- Pulling back `summary.json` and `artifact-manifest.json`.
- Writing a parity report beside the pulled-back files.

## Out Of Scope

- Provider APIs.
- `vast.ai` or `Runpod` integration.
- Multiple workloads.
- Queueing, retries, or cancellation controls.
- Stable app integration.
- Calculator-visible UI.

## Known Stop Reasons

- The first SSH target is VM-first; provider-host behavior is deferred.
- The only supported workload in this pilot is `sym-search-planner-ordering`.
- Authentication method is not the feature goal; password or key auth is acceptable if `ssh calcwiz-box` works reliably.
- A run does not count as successful if parity comes back `mismatch`, `remote-failed`, or `pullback-failed`.

## Success Criteria

- One real SSH target completes an end-to-end remote run.
- Remote artifacts are pulled back locally under `.task_tmp/pgl5-external-compute/`.
- The local parity report compares deterministic symbolic-search fields only.
- At least one real run returns `match`.

## Promotion Criteria

- The SSH pilot can run reliably enough to justify a later provider/rented-host decision.
- The artifact pullback and parity report shape prove useful in practice, not only in mocked tests.
- The next review can ask a provider-sequencing question rather than a transport-contract question.

## Retirement Criteria

- The VM-first SSH path adds too much operational friction for too little signal.
- Remote artifact pullback or parity adds no meaningful value over the existing local harness.
- Another bounded external-compute direction clearly supersedes the SSH pilot.
