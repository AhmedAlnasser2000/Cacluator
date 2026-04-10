# Calcwiz Agent Policy

## Authority And Read Order
- `AGENTS.md` is the authoritative workflow and agent-governance file for this repository.
- `CLAUDE.md` and `GEMINI.md` are compatibility stubs only; they must defer to `AGENTS.md` and must not define competing policy.
- Before substantial work, every agent must read in this order:
  - `AGENTS.md`
  - `.memory/PROTOCOL.md`
  - `.memory/current-state.md`
  - the active `.memory/sessions/<task-id>/...` dossier when one exists
- If any workflow or memory file conflicts with `AGENTS.md`, follow `AGENTS.md` and update the lower-priority file afterward.

## Memory Policy
- After finishing any task that changes code, architecture, tooling, UX behavior, or project workflow, append a concise dated note to `.memory/journal/YYYY-MM-DD.md` before sending the final response.
- If the task locks in a durable product or engineering decision, also append a dated bullet to `.memory/decisions.md`.
- If the task leaves an unresolved design or roadmap choice, append a dated bullet to `.memory/open-questions.md`.
- Durable memory under `.memory/` is expected to be tracked in git; temporary task tracking belongs in `.task_tmp/` and must stay ignored.
- Update `.memory/current-state.md` and the active `.memory/sessions/<task-id>/...` dossier whenever a meaningful task or verified gate completes.
- Keep memory updates short, factual, and human-readable. Prefer bullets.
- Do not make runtime behavior depend on `.memory/`.
- If `.memory/` is missing, recreate the existing structure before writing notes.
- Follow `.memory/PROTOCOL.md` for the durable-memory schema, attribution fields, journal format, and handoff rules.

## Agent Attribution Policy
- Every durable memory artifact for a meaningful task or verified gate must record ownership and provenance.
- Required durable-memory fields are defined in `.memory/PROTOCOL.md`, including:
  - `primary_agent`
  - `primary_agent_model`
  - `recorded_by_agent`
  - `recorded_by_agent_model`
  - `verified_by_agent`
  - `verified_by_agent_model`
  - `attribution_basis`
- Add `contributors`, `committed_by_agent`, and `committed_by_agent_model` when they materially apply.
- `primary_agent` means milestone owner, not merely the last editor.
- If an agent only updates memory, verification, or commit metadata, do not overwrite `primary_agent`.
- Every cross-agent handoff must be recorded in durable memory with a short dated note in the active session dossier.

## Workflow Policy
- Default workflow is commit-first, not worktree-first.
- Commit after each meaningful verified gate instead of after every tiny edit.
- Keep explicit user approval before `git commit` and `git push`.
- When a task is being committed, update session commit metadata as part of that same checkpoint whenever possible; do not create a second metadata-only commit just to record the hash unless recovery is unavoidable.
- Use `.task_tmp/<task-id>/` for multi-step or UI-heavy tasks that need gate notes, verification logs, or recovery artifacts.
- Label gates as `ui` or `backend` and record verification evidence before considering them complete.
- Worktrees or extra branches are exceptions for parallel isolation, risky rewrites, or recovery scenarios; they are not the default model for this repo.
- Do not make runtime behavior depend on workflow artifacts in `.task_tmp/`, `docs/checkpoints/`, or `.memory/`.
- Every meaningful gate must be labeled `ui` or `backend`.
- Every verified gate must record evidence before commit.
- Every completed task handoff must list which durable memory files were updated.
- Follow `docs/workflow/commit-first-gates.md` for the detailed gate contract and wrong-branch recovery procedure.

## Scope
- This policy is project-local and should be followed automatically in future sessions for this repository.
