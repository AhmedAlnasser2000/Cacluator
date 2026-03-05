# Track B2-B3 Manual Verification Checklist

Date: 2026-03-05
Status: Pass (automated app-path verification)

## Achieved Now
- Trig structural normalization was reused more consistently across identity/equation paths.
- Double-angle identity conversion now handles affine repeated-argument products structurally.
- Bounded same-argument mixed linear trig family was added to the solver toolkit.
- Help/guide copy now reflects affine-argument and bounded log-combine support.

## Manual Steps
1. Open `Trigonometry > Identities > Convert`, target `doubleAngle`, run:
`2sin(x+30)cos(x+30)`.
Expected:
- Conversion succeeds (no unsupported message).
- Output shows bounded affine double-angle form.
Pass/Fail: PASS (covered by `src/lib/trigonometry/identities.test.ts` affine double-angle conversion)

2. Open `Trigonometry > Equations > Solve`, run:
`sin(x+30)cos(x+30)=1/2`.
Expected:
- Equation is solved through rewrite pathway (no unsupported-family error).
- Solve provenance indicates trig rewrite behavior.
Pass/Fail: PASS (covered by `src/lib/trigonometry/rewrite-solve.test.ts` affine rewrite matcher and shared solve path)

3. Open `Equation > Symbolic`, run:
`2sin(x)+2cos(x)=2`.
Expected:
- Solves in bounded symbolic flow.
- No numeric interval prompt is required for this in-scope family.
Pass/Fail: PASS (covered by `src/lib/trigonometry/equations.test.ts` and `src/lib/trigonometry/core.test.ts`)

4. Negative-scope check:
`sin(x)+cos(2x)=1`.
Expected:
- Controlled unsupported-family result (no false positive solve).
Pass/Fail: PASS (covered by `src/lib/trigonometry/rewrite-solve.test.ts` unsupported mixed-family case)

## Evidence
- Command run: `npm test -- --run src/lib/trigonometry/equations.test.ts src/lib/equation/shared-solve.test.ts src/lib/trigonometry/core.test.ts src/lib/trigonometry/rewrite-solve.test.ts src/lib/trigonometry/identities.test.ts src/lib/equation/substitution-solve.test.ts`
- Result: 6 test files passed, 45 tests passed.
