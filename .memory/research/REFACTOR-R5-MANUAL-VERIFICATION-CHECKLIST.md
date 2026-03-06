# Refactor R5 Manual Verification Checklist

Date: 2026-03-05
Gate: R5 (Solver File Decomposition)
Scope: solver hotspots split into module folders with stable compatibility wrappers

## Achieved Now
- `src/lib/equation/substitution-solve.ts` is now a compatibility barrel over `src/lib/equation/substitution/*`.
- `src/lib/equation/guarded-solve.ts` is now a compatibility barrel over `src/lib/equation/guarded/*`.
- `src/lib/trigonometry/rewrite-solve.ts` is now a compatibility barrel over `src/lib/trigonometry/rewrite/*`.
- External import surfaces are preserved while internals are segmented by stage/family.

## App Steps
1. In `Equation > Symbolic`, solve `sin(x^2)=5`.
Expected: `Range Guard` impossible result still appears.
Pass/Fail: Pass (validated by range-impossibility + guarded-solve tests on 2026-03-06).

2. In `Equation > Symbolic`, solve `ln(x)+ln(x+1)=2`.
Expected: bounded log-combine path still succeeds with the same solve-note class.
Pass/Fail: Pass (validated by substitution/shared-solve tests on 2026-03-06).

3. In `Equation > Symbolic`, solve `sin(4x)+sin(6x)=0`.
Expected: trig sum-to-product path still solves through the shared backend.
Pass/Fail: Pass (validated by trig rewrite/guarded-solve tests on 2026-03-06).

4. In `Equation > Symbolic`, run a numeric interval solve such as `cos(x)=x` on `[0,1]`.
Expected: numeric interval path still works and reports numeric provenance.
Pass/Fail: Pass (validated by numeric-interval and guarded-solve tests on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- This gate is solver-behavior parity only. New module boundaries must not change solver outcomes.
