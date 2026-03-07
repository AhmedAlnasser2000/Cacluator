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
- Completed Track `D3`:
  - Added bounded regression/correlation diagnostics inside the existing Statistics screens.
  - Added `Quality Summary` detail sections with residual-size metrics and strength notes.
  - Added balanced low-sample and weak/moderate fit warnings without expanding into prediction or inferential regression.
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
- Exact Algebra Core `R1` is now implemented and regression-verified, pending manual app verification and commit:
  - added bounded app-owned rational normalization under `src/lib/symbolic-engine/rational.ts`
  - wired `Calculate > Simplify` and `Calculate > Factor` to combine/factor supported exact rational forms
  - wired `Equation > Symbolic` to normalize rational structure before solve, carry denominator exclusions, and reject excluded finite roots
  - rendered exclusion constraints as a second exact line in the result area

## Current Known Risks
- `src/AppMain.tsx` remains large; further decomposition should continue behind strict parity gates.
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Broader log transforms (`ln(u)-ln(v)`, ratio/power forms) remain intentionally out of bounded scope and should keep explicit unsupported messaging.
- Bounded trig sum-to-product currently covers two-term `sin/cos` forms only; broader harmonic families remain deferred.
- Statistics inference is intentionally bounded to one-sample mean workflows only; no proportion/categorical inference is in scope yet.
- Statistics still has no prediction UI, residual table, outlier/leverage tooling, or inferential regression; D3 stayed bounded to quality summaries only.
- Calcwiz still lacks an app-owned exact algebra core for rational/radical normalization, denominator-domain tracking, conjugate/rationalization workflows, and rational/radical equation preprocessing; full CAS claims should remain conservative until that pillar exists.
- Exact Algebra Core `R1` is intentionally bounded:
  - single-variable exact rational normalization only
  - simple denominator factors only (`v^n`, `av+b`, products/powers)
  - no radical normalization yet
  - no automatic LCD clearing or broader rational-equation family solving yet

## Pending Verification
- Optional desktop smoke pass on the current shell wiring for visual parity confidence beyond automated coverage.
- Keep the Track E manual checklist in parallel:
  - `.memory/research/TRACK-E-MANUAL-VERIFICATION-CHECKLIST.md`
- Track C checklist artifacts:
  - `.memory/research/TRACK-C-P0-P1-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-C-P2-MANUAL-VERIFICATION-CHECKLIST.md`
- Track D checklist artifact:
  - `.memory/research/TRACK-D-D1-D2-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-D-D3-MANUAL-VERIFICATION-CHECKLIST.md`
- Exact Algebra Core checklist artifact:
  - `.memory/research/TRACK-ALG-R1-MANUAL-VERIFICATION-CHECKLIST.md`

## Next Recommended Task
- Run the Exact Algebra Core `R1` manual checklist in app, then decide whether to commit this bounded rational-normalization gate before planning the next algebra milestone.
