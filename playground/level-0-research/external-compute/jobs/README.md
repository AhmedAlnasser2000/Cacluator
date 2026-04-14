# External Compute Job Specs

This folder holds tracked JSON job-spec templates for the external-compute foundations lane.

Rules:
- job specs are JSON, not YAML
- tracked files should stay template-safe and provider-neutral
- real execution artifacts belong in `.task_tmp/`, not here
- `PGL4` uses these specs for local harness validation and future-shape documentation
- `PGL5` uploads checked-in or operator-authored JSON specs to the remote SSH target before execution
- `PGL5+` standardizes the operator path around:
  - `npm run playground:ssh-vm -- --profile <path> --job <path>`

Tracked examples:
- `job-spec.template.json`
  - local-harness shape from the foundations pass
- `job-spec.ssh-vm.template.json`
  - provider-neutral SSH VM shape for the hardening/adoption gate
