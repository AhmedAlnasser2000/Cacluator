# External Compute Job Specs

This folder holds tracked JSON job-spec templates for the external-compute foundations lane.

Rules:
- job specs are JSON, not YAML
- tracked files should stay template-safe and provider-neutral
- real execution artifacts belong in `.task_tmp/`, not here
- `PGL4` uses these specs for local harness validation and future-shape documentation
- `PGL5` uploads checked-in or operator-authored JSON specs to the remote SSH target before execution
