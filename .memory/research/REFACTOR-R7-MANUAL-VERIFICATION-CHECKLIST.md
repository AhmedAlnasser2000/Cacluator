# Refactor R7 Manual Verification Checklist

Date: 2026-03-05
Gate: R7 (Calculator Type Decomposition)
Scope: `src/types/calculator.ts` reduced to a stable barrel over `src/types/calculator/*`

## Achieved Now
- Calculator types are partitioned across domain-focused files:
  - `mode-types.ts`
  - `guide-types.ts`
  - `display-types.ts`
  - `solver-types.ts`
  - `geometry-types.ts`
  - `trigonometry-types.ts`
  - `statistics-types.ts`
  - `equation-types.ts`
  - `linear-types.ts`
  - `runtime-types.ts`
  - `defaults.ts`
- `src/types/calculator.ts` stays as the compatibility facade.

## App Steps
1. Launch the app and smoke-test `Calculate`, `Equation`, `Trigonometry`, `Geometry`, and `Statistics`.
Expected: runtime behavior is unchanged because this gate is type-organization only.
Pass/Fail: Pass (validated by mode/core regression suite on 2026-03-06).

2. Use one cross-mode action such as `Send to Equation` or `Use in Trigonometry`.
Expected: no runtime breakage from type-barrel decomposition.
Pass/Fail: Pass (validated by cross-mode routing/core tests on 2026-03-06).

3. Replay one history entry after switching modes.
Expected: restored mode/screen behavior remains unchanged.
Pass/Fail: Pass (validated by history/replay/core tests on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- This checklist is intentionally short because the gate is type-surface decomposition, not a user-facing feature.
