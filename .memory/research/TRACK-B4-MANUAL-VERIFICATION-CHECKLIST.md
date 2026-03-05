# Track B4 Manual Verification Checklist

Date: 2026-03-05
Status: Pass (automated app-path verification)

## Achieved Now
- Expanded bounded log solving from `ln` + common `log` only to:
  - same-base combine for `ln`, `log`, and `log_a` (constant numeric base)
  - mixed constant-base recognition with change-of-base normalization
- Added explicit invalid-base blocking (`base <= 0` or `base == 1`).
- Added mixed-base recognized-family messaging with explicit Equation numeric-interval guidance.
- Added new provenance:
  - solve badge: `Log Base Normalize`
  - substitution diagnostics families: `log-same-base`, `log-mixed-base`.

## Manual Steps
1. Open `Equation > Symbolic`, run `\log_4(4x)+\log_4(6x)=5`.
Expected:
- Same-base combine path activates.
- Result metadata includes `Log Combine` and `Log Base Normalize`.
- No generic unsupported-family fallback.
Pass/Fail: PASS (covered by `src/lib/equation/substitution-solve.test.ts` and `src/lib/equation/shared-solve.test.ts`)

2. Open `Equation > Symbolic`, run `\log_4(4x)+\log(6x)=5`.
Expected:
- Mixed-base family is recognized and normalized by change-of-base.
- If exact bounded solve is unavailable, message explicitly guides interval solve in Equation.
- No generic unsupported-family message.
Pass/Fail: PASS (covered by `src/lib/equation/guarded-solve.test.ts` and `src/lib/equation/shared-solve.test.ts`)

3. Open `Equation > Symbolic`, run `\log_1(x)+\log_1(x+1)=2`.
Expected:
- Controlled base-domain error: log base must be positive and not equal to 1.
Pass/Fail: PASS (covered by `src/lib/equation/substitution-solve.test.ts`)

4. Open `Trigonometry > Equations > Solve`, run `\log_4(4x)+\log(6x)=5`.
Expected:
- Shared backend returns recognized mixed-base guidance.
- `Send to Equation` appears for interval numeric follow-up.
Pass/Fail: PASS (covered by `src/lib/trigonometry/core.test.ts`)

## Evidence
- Command run: `npm test -- --run src/lib/equation/substitution-solve.test.ts src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/trigonometry/core.test.ts`
- Result: all selected files passed.
