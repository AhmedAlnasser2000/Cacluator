# ARCH5 Completion Report

- Milestone: `ARCH5 — Shared Runtime Profiles and Execution Budgets for Equation and Calculate`
- Date: `2026-04-09`
- Status: verified, not yet committed

## Scope Delivered
- Added `src/types/calculator/runtime-profile-types.ts` as the focused internal contract layer for:
  - `RuntimeProfileId`
  - `RuntimeExecutionProfile`
  - `RuntimeExecutionBudget`
  - `EquationExecutionBudget`
  - `ExpressionExecutionBudget`
- Added `src/lib/kernel/runtime-profile.ts` so the runtime now resolves one explicit internal default execution profile and exposes host-specific budget helpers for Equation and Calculate.
- Rewired Equation runtime budget ownership so hardcoded caps now flow through the shared profile layer in:
  - `src/lib/equation/guarded/run.ts`
  - `src/lib/equation/composition-stage.ts`
  - `src/lib/equation/guarded/algebra-stage.ts`
  - `src/lib/equation/guarded/substitution-stage.ts`
- Rewired `src/lib/math-engine.ts` so numeric-fallback eligibility is now decided through shared expression-budget helpers instead of implicit host-local action checks.
- Kept public/runtime-facing behavior unchanged:
  - same host entrypoint signatures
  - same planner behavior
  - same visible wording and badges
  - same internal-only capability surface
  - no user-facing profile selector

## Behavior Notes
- Scope stayed limited to `Calculate` and `Equation`, with planner unchanged and treated as a host-first boundary only.
- The profile model stayed default-only and internal-only.
- No new runtime profile presets, job/progress concepts, persistence hooks, or plugin/extensibility mechanics were introduced.
- Internal expression `solve` remained non-public.

## Key Files
- `src/types/calculator/runtime-profile-types.ts`
- `src/types/calculator/runtime-types.ts`
- `src/types/calculator/runtime-contracts.test.ts`
- `src/lib/kernel/runtime-profile.ts`
- `src/lib/kernel/runtime-profile.test.ts`
- `src/lib/math-engine.ts`
- `src/lib/equation/guarded/run.ts`
- `src/lib/equation/composition-stage.ts`
- `src/lib/equation/guarded/algebra-stage.ts`
- `src/lib/equation/guarded/substitution-stage.ts`
