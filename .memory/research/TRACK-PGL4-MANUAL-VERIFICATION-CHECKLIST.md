# TRACK-PGL4 Manual Verification Checklist

## What Is Achieved Now

- Playground has an external-compute foundations lane under `playground/level-0-research/external-compute/`.
- The repo has provider-neutral runner/job/artifact contracts shaped for future SSH use.
- One real Playground workload is registered and can run through the local harness.
- SSH profile templates exist, but `PGL4` itself never performs real network execution.

## Manual Repo Steps

1. Open `playground/records/ext-compute-ssh-foundations.md`.
2. Confirm the record still describes a foundations-only milestone.
3. Confirm it does not claim that real SSH execution already exists.
4. Open `playground/manifests/ext-compute-ssh-foundations.yaml`.
5. Confirm the manifest matches the record `experiment_id`, status, and level.
6. Open `playground/level-0-research/external-compute/profiles/runner-profile.template.json`.
7. Confirm the tracked SSH profile stays template-only and does not contain real hosts, keys, or billing details.
8. Run `npm run test:playground`.

## Expected Results

- The external-compute lane is visibly foundations-only.
- The tracked config remains safe and generic.
- The real symbolic-search workload still executes through the local harness.
- No real SSH/provider execution is implied by the finished `PGL4` record.
