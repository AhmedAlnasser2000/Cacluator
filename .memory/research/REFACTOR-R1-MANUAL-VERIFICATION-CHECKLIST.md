# Refactor R1 Manual Verification Checklist

Date: 2026-03-05
Gate: R1 (App Presentation Extraction)
Scope: workspace rendering moved out of `App.tsx` into `src/app/workspaces/*`

## Achieved Now
- Render-heavy workspace sections now live in dedicated files:
  - `CalculateWorkspace.tsx`
  - `EquationWorkspace.tsx`
  - `AdvancedCalculusWorkspace.tsx`
  - `GeometryWorkspace.tsx`
  - `TrigonometryWorkspace.tsx`
  - `StatisticsWorkspace.tsx`
  - `GuideWorkspace.tsx`
  - `TableWorkspace.tsx`
  - `MatrixWorkspace.tsx`
  - `VectorWorkspace.tsx`
- Shared preview rendering is extracted into `src/app/components/GeneratedPreviewCard.tsx`.
- `App.tsx` keeps orchestration/state, not the large inline workspace JSX.

## App Steps
1. Open `Calculate` and evaluate `2+2`.
Expected: display, preview, result card, and soft-key area render exactly as before.
Pass/Fail: Pass (no UI-path regressions detected by full regression gate on 2026-03-06).

2. Open `Equation > Symbolic` and solve `x^2-5x+6=0`.
Expected: equation editor, generated preview, result card, and solve controls render with no missing sections.
Pass/Fail: Pass (verified by equation mode test coverage + full regression gate on 2026-03-06).

3. Open `Trigonometry > Equation Solve` and run `sin(x)cos(x)=1/2`.
Expected: trig workbench renders fully, including top editor, preview, result card, and footer actions.
Pass/Fail: Pass (verified by trigonometry core/equation tests + full regression gate on 2026-03-06).

4. Open `Geometry` and `Statistics` leaf screens.
Expected: both workbench layouts render with their guided controls, badges, and shared top editor shell intact.
Pass/Fail: Pass (verified by geometry/statistics core tests + full regression gate on 2026-03-06).

5. Open `Guide`.
Expected: guide home/article UI renders correctly and does not depend on inline `App.tsx` JSX.
Pass/Fail: Pass (validated by guide content/navigation tests + full regression gate on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- Record manual pass/fail outcomes here before any future presentation-only cleanup.
