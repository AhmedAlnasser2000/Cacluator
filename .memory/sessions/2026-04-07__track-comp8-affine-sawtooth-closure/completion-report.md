# COMP8 Completion Report

- Gate: `backend`
- Status: verified, not committed

## Delivered
- Added bounded affine sawtooth closure for `\arcsin(\sin(g(x)))`, `\arccos(\cos(g(x)))`, and `\arctan(\tan(g(x)))` when the reduced carrier is affine.
- Preserved principal-range exact collapse for already-contained carriers and extended the periodic-family result payload with piecewise exact branch metadata for affine sawtooth windows.
- Allowed one safe outer-inversion handoff into the same affine closure surface.
- Kept nonlinear carriers and broader sawtooth cases on structured guidance with reduced-carrier notes and explicit stop reasons.

## Main Files
- `src/lib/equation/composition-stage.ts`
- `src/lib/equation/guarded-solve.test.ts`
- `src/AppMain.ui.test.tsx`
- `e2e/qa1-smoke.spec.ts`

## Notes
- `COMP8` is Equation-only and still bounded to finite exact branches or a single periodic parameter `k ∈ Z`.
- Sign-flipped and reordered affine carriers are supported, but nonlinear carriers such as `x^2` remain outside the bounded sawtooth-closure surface.
