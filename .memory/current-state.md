# Current State

## Active Context
- Workspace: `Calcwiz`
- Active branch context: `main` with local milestone commits and no upstream configured yet in this workspace.
- Workflow default: commit-first with meaningful verified gates and explicit approval before commit or push.

## Current Product Phase
- Post harmonization pass for the three guided cores:
  - Geometry
  - Trigonometry
  - Statistics
- Post initial launcher/category and top-panel Guide consolidation.
- Post workflow and memory infrastructure overhaul to Memory V2.
- Track `R` decomposition sweep is closed and regression-verified.

## Stable Architecture Snapshot
- Desktop-first calculator with Tauri shell and React/TypeScript frontend.
- MathLive-backed textbook-style editing.
- Mode separation is intentional:
  - `Calculate` for general scalar/expression evaluation
  - `Equation` for solve workflows
  - domain cores for Geometry, Trigonometry, and Statistics
- Geometry, Trigonometry, and Statistics use the shared core-mode pattern:
  - one top executable draft/editor
  - guided menus and forms below
  - explicit transfers instead of implicit fallback into `Calculate`
- Guide is a top-panel utility, not a launcher app.
- Active runtime shell:
  - `src/App.tsx` is now the import shell (`App.css` + `AppMain`)
  - `src/AppMain.tsx` hosts orchestration/runtime rendering
  - `src/App.css` remains the import manifest over `src/styles/app/*`
- Extracted `src/app/*`, `src/styles/app/*`, and decomposition facades under solver/guide/types are in-tree and passing regression.

## Most Recent Completed Milestone
- Completed Track `R` closure pass:
  - finalized R0-R7 checklist pass entries
  - aligned Track `R` memory/session docs to current runtime shape
  - extracted shared app utilities from `AppMain` into `src/app/logic/appUtils.ts` and `src/app/logic/solveSummary.ts`
- Regression checks:
  - `npm test -- --run`
  - `npm run build`
  - `npm run lint`
  - `cargo check`

## Recent Verified Context
- Solver-side and type/content decomposition work from Track `R` is present under:
  - `src/lib/equation/{substitution,guarded}/*`
  - `src/lib/trigonometry/rewrite/*`
  - `src/lib/guide/content/*`
  - `src/types/calculator/*`
- App shell imports now resolve through `src/App.tsx` -> `src/AppMain.tsx` with shared styles via `src/App.css`.

## Current Known Risks
- `src/AppMain.tsx` remains large; further decomposition should continue behind strict parity gates.
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Broader log transforms (`ln(u)-ln(v)`, ratio/power forms) remain intentionally out of bounded scope and should keep explicit unsupported messaging.
- Bounded trig sum-to-product currently covers two-term `sin/cos` forms only; broader harmonic families remain deferred.

## Pending Verification
- Optional desktop smoke pass on the current shell wiring (Calculate/Equation/Trig/Geometry/Statistics/Guide) for visual parity confidence beyond automated coverage.
- Keep the Track E manual checklist in parallel:
  - `.memory/research/TRACK-E-MANUAL-VERIFICATION-CHECKLIST.md`

## Next Recommended Task
- Move to the next product-track milestone (A/B/C/D/E) on the current stable shell, and treat any further `AppMain` decomposition as a separate strict parity refactor gate.
