# Refactor R3 Manual Verification Checklist

Date: 2026-03-05
Gate: R3 (Focus, Guide, Reset, and App-Flow Extraction)
Scope: focus/reset/guide/app-flow orchestration moved into `src/app/logic/*`

## Achieved Now
- Focus routing is extracted to `focusRouting.ts`.
- Guide-routing helpers are extracted to `modeGuideRouting.ts`.
- Mode reset logic is extracted to `modeReset.ts`.
- App-flow helpers for clear/replay/example launch are extracted to `appFlowHandlers.ts`.

## App Steps
1. Open a menu-first screen and press `EXE/F1` before focusing the top editor.
Expected: menu-first behavior still wins.
Pass/Fail: Pass (validated by navigation/router tests + full regression gate on 2026-03-06).

2. Focus the top editor on a menu screen, then press `EXE/F1`.
Expected: editor execution runs instead of menu navigation.
Pass/Fail: Pass (validated by mode-core and routing tests + full regression gate on 2026-03-06).

3. Trigger `Clear` in at least two modes (`Equation`, `Statistics`, or `Geometry`).
Expected: mode-specific defaults restore exactly as before.
Pass/Fail: Pass (validated by equation/statistics/geometry mode tests + full regression gate on 2026-03-06).

4. Open a Guide article from a mode-specific help route, then use the app’s guide back path.
Expected: guide routing and return behavior are intact.
Pass/Fail: Pass (validated by guide navigation/content tests + full regression gate on 2026-03-06).

5. Create one history entry, then replay it.
Expected: replay restores the correct mode/screen/draft with no focus or state drift.
Pass/Fail: Pass (validated by equation-history + core replay tests + full regression gate on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- This gate closes only when focus, replay, clear, and guide behavior all feel unchanged in app use.
