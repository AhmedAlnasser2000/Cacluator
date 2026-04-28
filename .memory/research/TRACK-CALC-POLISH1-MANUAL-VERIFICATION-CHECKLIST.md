# TRACK CALC-POLISH1 Manual Verification Checklist

Date: 2026-04-28

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `CALC-POLISH1` adds optional typed history replay context for guided Calculus and Advanced Calc.
- Guided Calculate calculus history entries can preserve:
  - active calculus screen
  - derivative body/point state
  - integral body/bounds state
  - limit body/target/direction state
- Advanced Calc history entries can preserve:
  - active Advanced Calc tool
  - integral, limit, series, partial derivative, ODE, and numeric IVP tool state
- Replay uses typed context first, then falls back to existing LaTeX inference for older history entries.
- Calculus result chips are normalized across Calculate, Basic Calculus, and Advanced Calc using existing calculus area, provenance, and derivative/integration strategy metadata.
- Guide calculus examples now reflect shipped behavior from recent calculus milestones and `MATH-GOLDEN0`.
- Tauri history persistence accepts the new optional replay fields.

## Boundaries Preserved

- No math capability was added.
- No solver behavior changed.
- No new `ResultOrigin` values were added.
- No new derivative or integration strategy values were added.
- No proof/check status or step-by-step derivations were exposed.
- No broad UI redesign, Playground work, FriCAS work, telemetry, or release-flow change was added.

## Automation Gate

```bash
npm run test:golden
npm run test:unit -- src/lib/history-schema.test.ts src/lib/guide/content.test.ts src/lib/calculus-strategy.test.ts src/lib/calculus-workbench.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open `Calculus > Calculus > Integral`.
2. Enter `2x` and run.
3. Confirm the result shows calculus provenance and a rule-based symbolic result.
4. Open history and replay the latest entry.
5. Confirm the app returns to the Integral guided tool with `2x` restored.
6. Open `Calculus > Advanced Calc > Series > Maclaurin`.
7. Enter `sin(x)` and run.
8. Confirm the result shows `Advanced Calc`.
9. Open history and replay the latest entry.
10. Confirm the app returns to `Maclaurin` with `sin(x)` restored.
11. Open the Guide calculus sections.
12. Confirm derivative, integral, definite-integral, limit, Advanced series, partials, ODE, and numeric IVP examples do not overpromise beyond shipped behavior.

Expected result:
- replay restores the original guided calculus context when typed metadata exists
- older history remains compatible through fallback inference
- visible chips are coherent without new origins or strategy labels

## Pass/Fail

- Golden corpus: passed on 2026-04-28.
- Focused history/guide/calculus unit gate: passed on 2026-04-28.
- AppMain UI replay/regression gate: passed on 2026-04-28.
- Browser calculus smoke: passed on 2026-04-28.
- ESLint: passed on 2026-04-28.
- Production build: passed on 2026-04-28.
- Rust cargo check: passed on 2026-04-28.
- Memory protocol: passed on 2026-04-28.
- Manual smoke: optional after automation.
