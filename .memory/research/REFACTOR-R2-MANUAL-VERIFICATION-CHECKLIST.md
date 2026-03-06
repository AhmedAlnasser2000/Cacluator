# Refactor R2 Manual Verification Checklist

Date: 2026-03-05
Gate: R2 (Action Router Extraction)
Scope: primary/soft/keypad/expression routing moved into `src/app/logic/*`

## Achieved Now
- Expression routing is extracted to `expressionRouting.ts`.
- Primary action routing is extracted to `primaryActionRouter.ts`.
- Soft action routing is extracted to `softActionRouter.ts`.
- Keypad routing is extracted to `keypadRouter.ts`.
- `App.tsx` executes returned intents while routing decisions live in dedicated modules.

## App Steps
1. In `Equation > Symbolic`, press `F1 Solve` on a solvable equation.
Expected: the same solve path runs as before and returns the same result class.
Pass/Fail: Pass (validated by equation/shared-solve tests + full regression gate on 2026-03-06).

2. In a menu-first screen such as `Trigonometry` home or `Statistics` home, use `F1`, `F2`, `F5`, and `F6`.
Expected: open/guide/back/history actions still match prior mode-specific behavior.
Pass/Fail: Pass (validated by mode navigation/router tests + full regression gate on 2026-03-06).

3. Use `Copy Expr`, `Paste`, `To Editor`, and `Send to Equation` on representative result cards.
Expected: expression-routing targets and result transfers remain unchanged.
Pass/Fail: Pass (validated by expression-routing and mode-core tests + full regression gate on 2026-03-06).

4. Use the keypad / editor interaction on one math field.
Expected: routed keypad actions insert into the active editor exactly as before.
Pass/Fail: Pass (validated by keypadRouter + input canonicalization tests + full regression gate on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- This gate is about action parity only. Any behavioral drift here is a regression.
