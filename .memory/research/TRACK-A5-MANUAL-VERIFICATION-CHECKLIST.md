# Track A5 Manual Verification Checklist

Date: 2026-03-05
Status: Pass (automated app-path verification)

## Achieved Now
- Added bounded log-combine substitution for sum families only:
  - `ln(u)+ln(v)=c`
  - `log(u)+log(v)=c` (common log)
- Added positive-domain constraints for both combined inner arguments.
- Added solve provenance for this transform (`Log Combine`) plus substitution diagnostics family `log-combine`.
- Kept difference/ratio/power log transforms out of scope.

## Manual Steps
1. Open `Equation > Symbolic`, run `ln(x)+ln(x+1)=2`.
Expected:
- Equation no longer returns unsupported-family.
- Solve metadata includes `Log Combine` and substitution provenance.
- Returned roots satisfy domain (`x>0` and `x+1>0`).
Pass/Fail: PASS (covered by `src/lib/equation/shared-solve.test.ts` and `src/lib/equation/substitution-solve.test.ts`)

2. Open `Equation > Symbolic`, run `log(x)+log(x-1)=1`.
Expected:
- Equation solves through bounded combine transform.
- Domain-invalid branch candidates are filtered out.
Pass/Fail: PASS (covered by `src/lib/equation/substitution-solve.test.ts` matcher and shared guarded-solve integration)

3. Open `Trigonometry > Equations > Solve`, run `ln(x)+ln(x+1)=2`.
Expected:
- Same solve class and provenance as Equation flow.
- No `Send to Equation` prompt when symbolic solve succeeds in-place.
Pass/Fail: PASS (covered by `src/lib/trigonometry/core.test.ts` log-combine provenance parity)

4. Negative-scope check: run `ln(x)-ln(x+1)=2`.
Expected:
- Controlled unsupported-family outcome (no false solve).
- No misleading `Log Combine` badge.
Pass/Fail: PASS (covered by `src/lib/equation/substitution-solve.test.ts` unsupported difference case)

## Evidence
- Command run: `npm test -- --run src/lib/trigonometry/equations.test.ts src/lib/equation/shared-solve.test.ts src/lib/trigonometry/core.test.ts src/lib/trigonometry/rewrite-solve.test.ts src/lib/trigonometry/identities.test.ts src/lib/equation/substitution-solve.test.ts`
- Result: 6 test files passed, 45 tests passed.
