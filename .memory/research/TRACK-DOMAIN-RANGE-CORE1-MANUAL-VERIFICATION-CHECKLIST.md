# TRACK domain-range-CORE1 Manual Verification Checklist

Date: 2026-04-26

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `domain-range-CORE1` adds a shared bounded real-domain/range substrate before `CALC-INT1`.
- The core collects denominator, logarithm, root, negative-power, and inverse-trig input constraints.
- The core proves simple real ranges for constants, trig carriers, trig squares, positive exponentials, principal roots, absolute values, bounded sums, and bounded products.
- Equation domain checks, equation range-impossibility checks, and calculus finite-limit one-sided domain checks now use the shared substrate.
- Visible range-honesty wins include controlled impossible stops for `\sqrt{x}=-1` and `|x|=-2`.
- `CALC-INT1` can now consume bounded point, one-sided, and interval-safety readiness helpers.
- No general inequality solver, full interval-proof system, broad domain display, piecewise engine, definite-integral trust behavior, or `ResultOrigin` change is added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/algebra/domain-range-core.test.ts src/lib/equation/domain-guards.test.ts src/lib/equation/range-impossibility.test.ts src/lib/calculus-core.test.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint src/lib/algebra/domain-range-core.ts src/lib/algebra/domain-range-core.test.ts src/lib/equation/domain-guards.ts src/lib/equation/domain-guards.test.ts src/lib/equation/range-impossibility.ts src/lib/equation/range-impossibility.test.ts src/lib/calculus-core.ts src/lib/calculus-core.test.ts src/lib/math-engine.test.ts
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open Equation/Solve.
2. Enter `\sqrt{x}=-1`.
3. Confirm the app stops with a real-range explanation that principal square roots are nonnegative.
4. Enter `\left|x\right|=-2`.
5. Confirm the app stops with a real-range explanation that absolute values are nonnegative.
6. Open Calculate.
7. Enter `\lim_{x\to0^-}\ln(x)`.
8. Confirm the app stops with the existing outside-real-domain wording.
9. Enter `\lim_{x\to0^+}\ln(x)`.
10. Confirm the app still returns `-\infty`.

Expected result:
- shared domain/range checks improve honesty without adding broad new solve or calculus capability
- existing LIM1-LIM3 limit behavior remains intact
- `CALC-INT1` has a bounded interval-safety substrate ready for use

## Pass/Fail

- Focused domain/range/equation/calculus unit gate: passed on 2026-04-26.
- Browser smoke: passed on 2026-04-26.
- ESLint for touched files: passed on 2026-04-26.
- Production build: passed on 2026-04-26.
- Memory protocol: passed on 2026-04-26.
- Manual smoke: optional after automation.
