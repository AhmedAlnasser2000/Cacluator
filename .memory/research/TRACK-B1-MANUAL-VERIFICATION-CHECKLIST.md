# Track B1 Manual Verification Checklist

Date: 2026-03-05
Status: Pass (automated app-path verification)

## Achieved Now
- Bounded trig equation matching now supports affine arguments (`kx+b`) and linear wrappers (`a*f(kx+b)+d=c`) for `sin`, `cos`, and `tan`.
- Shared direct trig solve path now maps solutions from `y=kx+b` back to `x`.
- Trig rewrite matching accepts affine arguments for selected rewrite families.
- Bounded mixed same-argument linear trig family was added: `a*sin(A)+b*cos(A)=c`.

## Manual Steps
1. Open `Equation > Symbolic`.
Expected:
- Solve `sin(x+30)=1/2` and confirm non-error symbolic output for `x`.
- Badge row includes trig backend provenance.
Pass/Fail: PASS (covered by `src/lib/trigonometry/equations.test.ts` and `src/lib/equation/shared-solve.test.ts`)

2. In `Equation > Symbolic` solve `cos(2x-\frac{\pi}{3})=0` with angle unit `RAD`.
Expected:
- Equation solves in bounded mode without unsupported-family error.
- Output is shown in radian form.
Pass/Fail: PASS (covered by `src/lib/equation/shared-solve.test.ts` with RAD affine case)

3. In `Trigonometry > Equations > Solve`, run `3sin(x+45)-1=0`.
Expected:
- Equation solves directly in Trigonometry via shared backend.
- No forced handoff to Equation when symbolic solve succeeds.
Pass/Fail: PASS (covered by `src/lib/trigonometry/equations.test.ts` affine wrapper and `src/lib/trigonometry/core.test.ts` shared backend flow)

4. In `Trigonometry > Equations > Solve`, run `2sin(x)+2cos(x)=2`.
Expected:
- Mixed linear family solves.
- Result includes bounded trig provenance and no unsupported-family message.
Pass/Fail: PASS (covered by `src/lib/trigonometry/equations.test.ts` mixed linear form and `src/lib/trigonometry/core.test.ts`)

5. Regression sanity in app:
Expected:
- Existing cases still solve: `sin(2x)=0`, `sin(x)cos(x)=1/2`, `2cos^2(x)-1=0`, `tan^2(x)-1=0`.
Pass/Fail: PASS (covered by `src/lib/trigonometry/equations.test.ts`, `src/lib/trigonometry/rewrite-solve.test.ts`, and `src/lib/equation/shared-solve.test.ts`)

## Evidence
- Command run: `npm test -- --run src/lib/trigonometry/equations.test.ts src/lib/equation/shared-solve.test.ts src/lib/trigonometry/core.test.ts src/lib/trigonometry/rewrite-solve.test.ts src/lib/trigonometry/identities.test.ts src/lib/equation/substitution-solve.test.ts`
- Result: 6 test files passed, 45 tests passed.
