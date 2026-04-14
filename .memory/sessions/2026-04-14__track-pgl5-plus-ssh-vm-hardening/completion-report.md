# Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live

## Task Goal
- Implement `PGL5+` as the SSH VM hardening gate before any adoption decision: add a checked-in operator entrypoint, preflight/retry/timeout controls, explicit failure classes, provenance, and a live backend proof on `calcwiz-box`.

## Gate
- backend

## What Changed
- Reframed the Playground roadmap and records so `PGL5+` is the explicit pre-adoption hardening step between `PGL5` and any later provider-host or `PGL6` discussion.
- Promoted `ext-compute-ssh-vm-pilot` to `status: promoted` and opened the new `ext-compute-ssh-vm-hardening` record at `level-3-integration-candidates`.
- Added the required `TRACK-PGL5` manual verification checklist before the new track.
- Added a checked-in operator entrypoint:
  - `npm run playground:ssh-vm -- --profile <path> --job <path>`
- Extended SSH runner profiles with a required `reliability` block for:
  - preflight timeout
  - upload timeout
  - remote-run timeout
  - pullback timeout
  - upload retries
  - pullback retries
- Extended the SSH artifact manifest with:
  - `failureClass`
  - `stepResults`
  - `preflight`
  - `localProvenance`
  - `remoteProvenance`
  - richer `remoteExecution` metadata
- Extended parity reporting with explicit compared-field provenance and first-mismatch detail.
- Added mocked coverage for:
  - preflight failure classification
  - upload retry
  - pullback retry
  - remote timeout
  - cancellation
  - parity mismatch

## Verification
- `npm run test:playground`
- `npx eslint eslint.config.js src playground`
- `npx tsc -b --pretty false`
- `npm run test:memory-protocol`
- live success path:
  - `npm run playground:ssh-vm -- --profile playground/level-0-research/external-compute/profiles/calcwiz-box.local.json --job .task_tmp/pgl5-plus/job-success.json`
- live failure-path proof:
  - `npm run playground:ssh-vm -- --profile .task_tmp/pgl5-plus/profile-bad-path.json --job .task_tmp/pgl5-plus/job-bad-path.json`
  - `npm run playground:ssh-vm -- --profile .task_tmp/pgl5-plus/profile-timeout.json --job .task_tmp/pgl5-plus/job-timeout.json`

## Verification Notes
- The success path completed with:
  - manifest `status: completed`
  - parity report `resultClass: match`
- The bad-path profile classified correctly as:
  - `failureClass: preflight-failed`
- The tiny-timeout profile classified correctly as:
  - `failureClass: remote-timeout`
- The live `calcwiz-box` operator flow now no longer depends on a handwritten `.task_tmp` runner script.

## Commits
- Not committed yet. Waiting for explicit user approval.

## Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-04-14.md`
- `.memory/research/TRACK-PGL5-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/playground-incubation-roadmap.md`
- `.memory/sessions/2026-04-14__track-pgl5-plus-ssh-vm-hardening/completion-report.md`
- `.memory/sessions/2026-04-14__track-pgl5-plus-ssh-vm-hardening/verification-summary.md`
- `.memory/sessions/2026-04-14__track-pgl5-plus-ssh-vm-hardening/commit-log.md`

## Follow-Ups
- Decide whether the next external-compute review should:
  - expand to a provider/rented host
  - or keep the VM-first lane internal-only / no-adopt for now
