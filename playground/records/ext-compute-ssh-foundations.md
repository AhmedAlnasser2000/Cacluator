# External Compute SSH Foundations and Local Harness

## Metadata

- experiment_id: `ext-compute-ssh-foundations`
- title: `External Compute SSH Foundations and Local Harness`
- owner: `unassigned`
- lane_topic: `external-compute`
- current_level: `level-0-research`
- status: `promoted`
- date_started: `2026-04-14`
- last_reviewed: `2026-04-14`
- next_review: `closed - promoted into ext-compute-ssh-vm-pilot`
- candidate_stable_home: `future remote execution adapters / orchestration layer`
- companion_manifest: `playground/manifests/ext-compute-ssh-foundations.yaml`

## Hypothesis

- Calcwiz can prepare for future SSH-backed external compute safely by first defining provider-neutral runner/job/artifact contracts and proving them locally over a real Playground workload, without introducing remote execution into stable product behavior.

## Why It Matters

- External compute is one of the strongest Playground candidates, but it adds trust, cost, latency, and credential-handling risks.
- A foundations-first step lets the repo prove execution contracts and artifact shape before any provider-specific path exists.
- That keeps future SSH/provider work subordinate to Playground instead of turning it into an architectural shortcut.

## In Scope

- Provider-neutral runner/job/artifact contracts.
- A checked-in SSH-shaped profile template plus ignored local profile support.
- A local harness that executes one real existing Playground workload.
- Provenance, artifact, and not-yet-implemented behavior for future SSH runner kinds.

## Out Of Scope

- Real SSH execution.
- Provider credentials or account setup.
- `vast.ai` or `Runpod` integration.
- Stable app integration.
- UI exposure.
- Remote fallback in product paths.

## Known Stop Reasons

- `PGL4` is foundations-only and must not attempt network execution.
- Stable product code must never depend on Playground external-compute code.
- Tracked files must not contain private keys, provider tokens, real hostnames, or billing details.
- Any future provider pilot must wait until the foundations contract proves useful locally first.

## Success Criteria

- The repo has a reusable runner/job/artifact contract shaped for future SSH use.
- One real existing Playground workload runs end-to-end through the local harness and writes structured artifacts to `.task_tmp/`.
- SSH runner profiles validate structurally and return an explicit non-executable foundations result instead of attempting network access.

## Promotion Criteria

- The foundations contract proves stable enough locally to justify a separate decision about a first real SSH/provider pilot.
- The local harness demonstrates that workload registration, artifact writing, and provenance capture are worth carrying forward.
- The next review can ask a concrete provider-pilot question instead of an infrastructure-shape question.

## Retirement Criteria

- The local harness provides no useful execution or artifact signal.
- The contract proves too abstract to guide a real future pilot.
- Another external-compute incubation approach clearly supersedes this foundations lane.

## Result Summary

- `PGL4` delivered the provider-neutral contract, JSON templates, workload registry, and local harness exactly as intended.
- The real symbolic-search workload proved that the contract was useful enough to carry forward.
- The next review is no longer about contract shape; it is about taking one bounded real SSH step.

## Promotion Decision

- Decision: promote the foundations lane into the first real SSH pilot record.
- Follow-on record: `ext-compute-ssh-vm-pilot`
- Rationale:
  - the foundations contract produced a real local harness proof
  - SSH profile shape and ignored local-profile rules were stable enough to support one real remote target
  - the next bounded question became remote execution parity, not contract invention
