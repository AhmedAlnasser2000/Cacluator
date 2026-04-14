# Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live

## Scope
- `PGL5+` SSH VM hardening gate
- checked-in `playground:ssh-vm` operator path
- manifest failure classes, step results, preflight evidence, and provenance
- live `calcwiz-box` success and deliberate failure-path probes

## Gate
- backend

## Commands
- `npm run test:playground`
- `npx eslint eslint.config.js src playground`
- `npx tsc -b --pretty false`
- `npm run test:memory-protocol`
- `npm run playground:ssh-vm -- --profile playground/level-0-research/external-compute/profiles/calcwiz-box.local.json --job .task_tmp/pgl5-plus/job-success.json`
- `npm run playground:ssh-vm -- --profile .task_tmp/pgl5-plus/profile-bad-path.json --job .task_tmp/pgl5-plus/job-bad-path.json`
- `npm run playground:ssh-vm -- --profile .task_tmp/pgl5-plus/profile-timeout.json --job .task_tmp/pgl5-plus/job-timeout.json`

## Manual Checks
- Live `calcwiz-box` success path completed with manifest `status: completed`.
- Live `calcwiz-box` success path completed with parity `resultClass: match`.
- Intentional bad `remoteProjectPath` produced `failureClass: preflight-failed`.
- Intentional tiny `remoteRunTimeoutSeconds` produced `failureClass: remote-timeout`.

## Outcome
- Passed.
- The hardening gate now has one live success path and two induced failure-path proofs with the expected classifications.

## Outstanding Gaps
- Provider/rented-host behavior is still unproven.
- No adoption decision has been made yet; the lane remains an integration candidate rather than stable product architecture.
