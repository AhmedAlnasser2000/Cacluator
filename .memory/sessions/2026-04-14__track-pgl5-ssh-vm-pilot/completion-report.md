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
- Implement `PGL5` as the first real SSH remote pilot on the user-owned VM target: replace the SSH stub with a bounded remote run over `ssh`/`scp`, pull back remote artifacts locally, and write a parity report against a fresh local baseline for `sym-search-planner-ordering`.

## Gate
- backend

## What Changed
- Reframed the Playground roadmap so `PGL5` now means one real VM-first SSH pilot instead of a vague bounded prototype step.
- Added the required `TRACK-PGL4` manual verification checklist before starting the new track.
- Extended the external-compute SSH contract with:
  - required `remoteProjectPath`
  - optional local manifest `remoteExecution` metadata for pulled-back outputs and parity-report location
- Added a shared workload-execution helper so:
  - the local harness
  - the remote entrypoint
  - the local parity baseline
  all write the same manifest/summary shape without duplicating workload logic.
- Replaced the SSH `not-implemented` branch with a real bounded orchestration flow that:
  - writes local input JSON
  - uploads it to the VM
  - runs a dedicated remote Playground entrypoint
  - pulls back remote `artifact-manifest.json` and `summary.json`
  - writes a local `parity-report.json`
- Added a dedicated remote Playground entrypoint plus a skipped-by-default lab test file so normal `test:playground` runs stay stable while the remote path can still be invoked through `vitest`.
- Promoted the completed foundations record `ext-compute-ssh-foundations`, created the new active pilot record `ext-compute-ssh-vm-pilot`, and added a short symbolic-search reuse note.

## Verification
- `npm run test:playground`
- `npx eslint eslint.config.js src playground`
- `npm run test:memory-protocol`

## Verification Notes
- The SSH path is covered in automated tests through mocked `ssh`/`scp` command execution.
- The lab verifies:
  - missing `remoteProjectPath` is rejected
  - remote command construction uses `hostAlias` and `remoteProjectPath`
  - pulled-back manifest and summary parsing works
  - parity can classify `match`, `mismatch`, `remote-failed`, and `pullback-failed`
- The user-owned VM was already proven manually as a reachable SSH target (`calcwiz-box`) and as a valid Playground execution environment.
- The plan’s live manual backend gate for one real `executeExternalComputeJob(...)` SSH run was not executed from this local automation session.

## Commits
- Recorded in the current `HEAD` checkpoint for the `PGL5` milestone flow.

## Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-04-14.md`
- `.memory/research/TRACK-PGL4-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/playground-incubation-roadmap.md`
- `.memory/sessions/2026-04-14__track-pgl5-ssh-vm-pilot/completion-report.md`
- `.memory/sessions/2026-04-14__track-pgl5-ssh-vm-pilot/verification-summary.md`
- `.memory/sessions/2026-04-14__track-pgl5-ssh-vm-pilot/commit-log.md`

## Follow-Ups
- Decide whether the next external-compute incubation step should move to a provider/rented host or stay VM-first for one more bounded operator/refinement pass.
