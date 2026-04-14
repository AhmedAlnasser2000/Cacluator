# TRACK-PGL5 Manual Verification Checklist

## What Is Achieved Now

- Playground has one real VM-first SSH pilot record promoted beyond transport proof.
- The repo can upload a real workload to `calcwiz-box`, run it remotely, pull artifacts back, and compare them against a fresh local parity baseline.
- The pulled-back manifest and parity report now prove that `PGL5` was not only implemented in mocked tests; it was also proven live on the user-owned SSH target.

## Manual Repo Steps

1. Open `playground/records/ext-compute-ssh-vm-pilot.md`.
2. Confirm the record is `status: promoted`.
3. Confirm the `Live Result` section records:
   - manifest `status: completed`
   - parity `resultClass: match`
4. Open `playground/manifests/ext-compute-ssh-vm-pilot.yaml`.
5. Confirm the manifest status is `promoted` and the follow-on work points to `ext-compute-ssh-vm-hardening`.
6. Verify that `ssh calcwiz-box` works in batch mode:
   - `ssh -o BatchMode=yes calcwiz-box "echo ok"`
7. From the repo root, run:
   - `npm run playground:ssh-vm -- --profile playground/level-0-research/external-compute/profiles/calcwiz-box.local.json --job .task_tmp/pgl5-plus/job-success.json`
8. Open the generated local artifacts under:
   - `.task_tmp/pgl5-external-compute/sym-search-planner-ordering-hardening-success/`

## Expected Results

- The promoted `PGL5` record shows that the VM-first SSH pilot is no longer an open transport-proof question.
- The batch-mode SSH check succeeds on `calcwiz-box`.
- The checked-in operator command completes end to end and leaves:
  - local manifest `status: completed`
  - parity report `resultClass: match`
