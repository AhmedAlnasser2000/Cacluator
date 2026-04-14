# External Compute Profiles

Use this folder for checked-in profile templates and ignored local runner profiles.

Rules:
- tracked files here must be templates only
- local machine profiles should use `*.local.json`
- local profiles are ignored by git
- never store private keys, provider tokens, real hostnames, or billing details in tracked files

The first real remote transport is SSH-backed.
The tracked template should stay generic, while the actual operator profile stays local-only.

For `PGL5`, the current verified operator values are:
- host alias: `calcwiz-box`
- remote project path: `/home/ahmed/calcwiz-playground/Calculator`

Do not check those operator-specific values into tracked profile files.
