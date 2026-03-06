# Refactor R6 Manual Verification Checklist

Date: 2026-03-05
Gate: R6 (Guide Content Decomposition)
Scope: guide content/selectors moved under `src/lib/guide/content/*` with stable facade export

## Achieved Now
- `src/lib/guide/content.ts` now re-exports from `src/lib/guide/content/selectors`.
- Guide content is partitioned by domain/article family under `src/lib/guide/content/*`.
- Public guide selectors and article IDs remain stable.

## App Steps
1. Open Guide home and search for `equation`.
Expected: guide search still returns the same relevant articles and mode references.
Pass/Fail: Pass (validated by guide search/content tests on 2026-03-06).

2. Open one article each from algebra, trigonometry, geometry, statistics, and advanced calculus.
Expected: article IDs, content, and navigation behave exactly as before.
Pass/Fail: Pass (validated by guide content contract/content tests on 2026-03-06).

3. Launch a guide example from an article back into the target mode.
Expected: guide launch behavior still routes into the correct mode/screen/input.
Pass/Fail: Pass (validated by guide navigation + core mode tests on 2026-03-06).

4. Open a mode-specific guide entry from inside a workspace.
Expected: active guide routing still resolves the correct article/mode reference.
Pass/Fail: Pass (validated by guide selectors/navigation tests on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- This gate is about guide-content ownership split, not any guide UX rewrite.
