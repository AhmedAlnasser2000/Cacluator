# TRACK CALC-LIM1 Manual Verification Checklist

Date: 2026-04-25

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `CALC-LIM1` strengthens finite limits through the shared Basic/Advanced calculus backend.
- Known finite-limit forms such as `sin(u)/u`, `tan(u)/u`, `(1-cos(u))/u^2`, `(e^u-1)/u`, `ln(1+u)/u`, and `(sqrt(1+u)-1)/u` now resolve as app-owned rule-based symbolic wins when `u -> 0`.
- Simple removable polynomial-rational holes reuse existing rational normalization/cancellation instead of adding a calculus-local rational simplifier.
- Capped L'Hopital remains available only as fallback for supported cases outside the exact known-form matcher.
- Clear one-sided real-domain gaps for finite limits now produce domain-specific controlled errors.
- Numeric fallback remains visibly labeled and no new `ResultOrigin` values or limit strategy badges are added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/symbolic-engine/limits.test.ts src/lib/calculus-core.test.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.test.ts
npx eslint src/lib/symbolic-engine/limits.ts src/lib/symbolic-engine/limits.test.ts src/lib/calculus-core.ts src/lib/calculus-core.test.ts src/lib/calculus-eval.ts src/lib/advanced-calc/limits.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.test.ts e2e/calc-audit0-smoke.spec.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open `MENU > Calculus > Advanced Calc > Limits > Finite Target`.
2. Run `ln(1+x)/x` at target `0`.
3. Confirm the result is `1` and shows `Rule-based symbolic`, not `Numeric fallback`.
4. Run `(1-cos(x))/x^2` at target `0`.
5. Confirm the result is near `0.5`.
6. Run `sqrt(x)` at target `0` as a two-sided limit.
7. Confirm the result stops with a real-domain message for the left-hand side.
8. Run `|x|/x` at target `0`.
9. Confirm two-sided mismatch still stops, while left and right directional limits return `-1` and `1`.

Expected result:
- bounded known finite-limit forms resolve symbolically
- unsafe/domain-sensitive cases stop honestly
- numeric fallback remains labeled
- no general asymptotic engine, multivariable limit support, or limit strategy badge appears

## Pass/Fail

- Focused calculus/limit unit gate: passed on 2026-04-25.
- ESLint for touched limit/calculus/e2e files: passed on 2026-04-25.
- Browser smoke: passed on 2026-04-25.
- Production build: passed on 2026-04-25.
- Memory protocol: passed on 2026-04-25.
- Manual smoke: optional after automation.
