# Track B5 Manual Verification Checklist

Date: 2026-03-05
Status: Pass (automated app-path verification)

## Achieved Now
- Added bounded trig sum-to-product normalization for two-term families:
  - `sin(M)±sin(N)=c`
  - `cos(M)±cos(N)=c`
  - with bounded affine arguments (`kx+b`) only.
- Added exact zero-target branch splitting:
  - normalized product `=0` splits into two branch equations solved through existing bounded trig backend.
- Added controlled recognized-unresolved messaging for non-zero families outside exact bounded coverage.
- Added solve provenance badge: `Trig Sum-Product`.

## Manual Steps
1. Open `Equation > Symbolic`, run `\sin(4x)+\sin(6x)=0`.
Expected:
- Sum-to-product normalization activates.
- Zero-product branch split is applied.
- Solve metadata includes `Trig Sum-Product`.
Pass/Fail: PASS (covered by `src/lib/trigonometry/rewrite-solve.test.ts` and `src/lib/equation/guarded-solve.test.ts`)

2. Open `Equation > Symbolic`, run `\cos(4x)-\cos(2x)=0`.
Expected:
- Sum-to-product branch split activates and solves through bounded trig families.
- Result remains in shared Equation backend.
Pass/Fail: PASS (covered by `src/lib/equation/shared-solve.test.ts`)

3. Open `Equation > Symbolic`, run `\sin(4x)+\sin(6x)=1`.
Expected:
- Recognized-family message appears:
  - outside current exact bounded set
  - explicit guidance to use interval numeric solve in Equation.
- No generic unsupported-family message.
Pass/Fail: PASS (covered by `src/lib/equation/guarded-solve.test.ts`)

4. Open `Trigonometry > Equations > Solve`, run `\sin(4x)+\sin(6x)=1`.
Expected:
- Same recognized-family message.
- `Send to Equation` appears for interval numeric follow-up.
Pass/Fail: PASS (covered by `src/lib/trigonometry/core.test.ts`)

## Evidence
- Command run: `npm test -- --run src/lib/trigonometry/rewrite-solve.test.ts src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/trigonometry/core.test.ts`
- Result: all selected files passed.
