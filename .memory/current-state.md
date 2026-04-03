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
- Completed `PRL1` as the first power/root/log display-normalization pass:
  - added a bounded display-only symbolic normalization layer for rendered exact math
  - made `Symbolic Display` settings from `SX1` live on exact results, supplement lines, exact-error math, transform preview math, and the settings preview
  - kept copy-to-clipboard, `To Editor`, replay, and persisted history on raw engine exact LaTeX for safety
  - normalized selected awkward/nested root-power forms while keeping familiar plain roots readable across modes
  - added light log notation cleanup (`\ln`, base-10 `\log`) without introducing broader symbolic log algebra
- Regression checks:
  - `npm run test:gate`

## Recent Verified Context
- Workflow docs now include `docs/workflow/cloud-local-sync-reference.md` as the quick handoff checklist between cloud and local VS Code sessions.
- Solver-side and type/content decomposition work from Track `R` is present under:
  - `src/lib/equation/{substitution,guarded}/*`
  - `src/lib/trigonometry/rewrite/*`
  - `src/lib/guide/content/*`
  - `src/types/calculator/*`
- App shell imports now resolve through `src/App.tsx` -> `src/AppMain.tsx` with shared styles via `src/App.css`.
- Exact Algebra Core `R1` is shipped:
  - added bounded app-owned rational normalization under `src/lib/symbolic-engine/rational.ts`
  - wired `Calculate > Simplify` and `Calculate > Factor` to combine/factor supported exact rational forms
  - wired `Equation > Symbolic` to normalize rational structure before solve, carry denominator exclusions, and reject excluded finite roots
  - rendered exclusion constraints as a second exact line in the result area
- Exact Algebra Core `R2` is shipped:
  - added bounded app-owned radical normalization under `src/lib/symbolic-engine/radical.ts`
  - wired `Calculate > Simplify`, `Factor`, and `Expand` to normalize supported radicals exactly
  - wired `Equation > Symbolic` to normalize supported radicals before solve, preserve radical-domain / denominator conditions, and reject invalid finite roots
  - kept radical work bounded to normalization + solve prep only, with no new radical-equation solve family in this milestone
- Track `D3` is shipped:
  - bounded regression/correlation diagnostics inside the existing Statistics screens
  - `Quality Summary` detail sections with residual-size metrics and strength notes
  - balanced low-sample and weak/moderate fit warnings without expanding into prediction or inferential regression
- Track `QA1` is shipped:
  - `src/AppMain.tsx` and shared editor/result surfaces now expose stable non-user-facing test ids
  - `src/test/*` provides jsdom setup and `AppMain` render helpers
  - `e2e/*` provides browser smoke helpers and one critical path per core mode
  - milestone verification is now expected to run through `npm run test:gate`
- Exact Algebra Core `R3` is shipped:
  - `Equation > Symbolic` now performs bounded rational LCD-clearing solves and bounded radical isolation / nth-power solving through the guarded backend
  - candidate validation now marks transformed symbolic outcomes as `Candidate Checked`
  - bounded square-root-binomial conjugate families are recognized inside the algebra stage and either solve through the shared backend or fail with controlled messaging
  - UI integration and browser smoke now include an Equation rational solve path that exercises `LCD Clear`
- Exact Algebra Core `R4` is verified:
  - `src/lib/algebra-transform.ts` now exposes explicit bounded transform actions shared by `Calculate` and `Equation`
  - `Calculate` standard uses `F4 Algebra` to show only eligible transform chips inline in the result area
  - `Equation > Symbolic` uses the same tray shape, but transform chips rewrite the equation without auto-solving it
  - transform results now carry `transformBadges` and `transformSummaryText` separate from solve badges/summaries
  - browser-first automation now covers the new tray flows in both `Calculate` and `Equation`
- Exact Algebra Core `R5` is verified:
  - the guarded algebra stage now solves supported one-variable monomial/binomial rational equations after exact LCD clearing and recursion
  - square-root equations with supported monomial/binomial radicands may now use one additional safe isolation/power step before candidate validation
  - supported square-root-binomial conjugate families now solve when the transformed equation stays inside the bounded shared solve surface
  - browser-first automation covers widened rational/radical Equation flows and the existing transform tray remains the user-facing control surface
- `SX1` settings foundation is verified:
  - `src/components/SettingsPanel.tsx` provides the canonical settings surface with `Display`, `Symbolic Display`, `General`, and `History` sections
  - `src/AppMain.tsx` now owns the global `settingsOpen` shell state, the docked/overlay presentation switch at `1180px`, and Settings/History mutual exclusion
  - shell-level CSS variables in `src/styles/app/shell.css` now drive UI scale, math scale, result scale, and high-contrast behavior live
  - persisted settings now include display and symbolic-display preferences through the shared frontend schema and Tauri persistence model
  - browser-first automation now covers docked settings, overlay settings, quick-toggle synchronization, and Settings/History exclusivity
- `SX1.1` outboard side-rail correction is verified:
  - `Settings` and `History` now share one shell-level side-surface controller and one right-side slot instead of rendering inside the calculator shell
  - outboard mode now depends on measured spare right gutter space (`>= 424px`) on top of the existing `1180px` viewport floor
  - the calculator shell stays full-width when the rail opens; overlay remains the fallback whenever real gutter space is not available
  - browser-first automation now checks both outboard settings/history presentation and shell-width stability on wide layouts
- `PRL1` power/root/log display normalization is verified:
  - `src/lib/symbolic-display.ts` now provides a bounded display-only normalization layer over exact LaTeX for selected rendered math surfaces
  - `src/components/MathStatic.tsx` can opt into display preferences without changing raw exact LaTeX used by copy/editor/history flows
  - `SX1` symbolic display preferences are now live in app output instead of preview-only
  - browser-first automation covers settings-driven display changes while preserving raw exact LaTeX for `Copy Result` and `To Editor`
- Repo line endings are now governed by `.gitattributes`:
  - LF for source, docs, and config text
  - CRLF only for Windows-native scripts

## Current Known Risks
- `src/AppMain.tsx` remains large; further decomposition should continue behind strict parity gates.
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Browser-first automation does not cover Tauri-shell-specific behavior yet; desktop-shell automation remains deferred behind the stronger repo-owned browser gate.
- Broader log transforms (`ln(u)-ln(v)`, ratio/power forms) remain intentionally out of bounded scope and should keep explicit unsupported messaging.
- `PRL1` is intentionally presentation-only:
  - no broader power/root/log capability has shipped yet
  - no engine canonicalization or symbolic-solve breadth changed in this pass
  - prettier radical-product rewrites such as `x\sqrt{x}` remain deferred
- Bounded trig sum-to-product currently covers two-term `sin/cos` forms only; broader harmonic families remain deferred.
- Statistics inference is intentionally bounded to one-sample mean workflows only; no proportion/categorical inference is in scope yet.
- Statistics still has no prediction UI, residual table, outlier/leverage tooling, or inferential regression; D3 stayed bounded to quality summaries only.
- Calcwiz now has bounded app-owned rational/radical normalization plus first-pass rational/radical equation solving, but it still lacks the broader CAS-grade algebra stack:
  - explicit transform UX and provenance controls beyond current badges/summaries
  - broader denominator-domain tracking
  - wider conjugate / rationalization coverage
  - repeated or nested radical-clearing families
  - broader rational/radical solve breadth beyond the current bounded families
- Exact Algebra Core `R1` is intentionally bounded:
  - single-variable exact rational normalization only
  - simple denominator factors only (`v^n`, `av+b`, products/powers)
  - no automatic LCD clearing or broader rational-equation family solving yet
- Exact Algebra Core `R5` is intentionally bounded:
  - single-variable exact algebra only
  - rational factors are widened only to one-variable monomial/binomial families, not arbitrary polynomial factors
  - radical solving stays centered on square-root monomial/binomial radicands with at most two safe transform steps
  - no nested denesting, unrestricted repeated squaring, or theorem-prover-style search
  - broader nth-root chaining beyond single-radical isolation remains deferred
- QA1 automation is intentionally bounded:
  - browser-first only
  - smoke-level E2E per core mode, not exhaustive UI coverage
  - jsdom uses a stable MathEditor test stub instead of the full MathLive runtime

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
  - `.memory/research/TRACK-ALG-R2-MANUAL-VERIFICATION-CHECKLIST.md`
- QA1 optional smoke checklist artifact:
  - `.memory/research/TRACK-ALG-R3-QA-MANUAL-VERIFICATION-CHECKLIST.md`
- Exact Algebra Core checklist artifact:
  - `.memory/research/TRACK-ALG-R4-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-ALG-R5-MANUAL-VERIFICATION-CHECKLIST.md`
- Settings shell checklist artifact:
  - `.memory/research/TRACK-SX1.1-MANUAL-VERIFICATION-CHECKLIST.md`

## Next Recommended Task
- Preferred next roadmap is now:
  1. `PRL2` broad numeric exponent/root/log support
  2. `PRL3` bounded symbolic exponent/root/log support
  3. `PRL4` bounded solve expansion for these families
- `PRL2` remains the best next move after `PRL1`: broaden real-domain numeric coverage before taking on broader symbolic or solve-family risk.
