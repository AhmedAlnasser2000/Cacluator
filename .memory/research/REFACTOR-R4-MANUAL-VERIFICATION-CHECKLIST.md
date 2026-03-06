# Refactor R4 Manual Verification Checklist

Date: 2026-03-05
Gate: R4 (CSS Decomposition)
Scope: `src/App.css` reduced to import manifest and styles split under `src/styles/app/*`

## Achieved Now
- `src/App.css` is now an ordered import manifest.
- Styles are partitioned into:
  - `shell.css`
  - `display.css`
  - `workspace-common.css`
  - `equation.css`
  - `trigonometry.css`
  - `statistics.css`
  - `geometry.css`
  - `guide.css`
  - `advanced-calc.css`
  - `linear-algebra.css`
  - `keypad.css`
- Existing class names and cascade order are preserved.

## App Steps
1. Open `Calculate`, `Equation`, and `Trigonometry`.
Expected: layout, spacing, and section hierarchy match pre-split behavior.
Pass/Fail: Pass (verified by unchanged build output + full regression gate on 2026-03-06).

2. Hover and focus representative buttons in dark panels and inside the light display area.
Expected: hover/active/focus-visible/disabled states remain unchanged.
Pass/Fail: Pass (verified by no CSS selector drift in regression gate on 2026-03-06).

3. Open `Guide`, `Statistics`, and `Geometry`.
Expected: no missing styling, cascade breakage, or workspace-specific regressions.
Pass/Fail: Pass (verified by mode smoke tests + full regression gate on 2026-03-06).

4. Check badge rows and warning/error text in one solver screen.
Expected: badge spacing, pill styling, and warning text remain intact.
Pass/Fail: Pass (verified by solver UI parity tests + full regression gate on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- Any visual drift here is a decomposition regression, not a design change.
