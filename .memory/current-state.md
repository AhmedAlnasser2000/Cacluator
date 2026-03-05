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

## Most Recent Completed Milestone
- Delivered `B4 -> B5`:
  - B4: bounded log base expansion (same-base `ln/log/log_a`, mixed constant-base normalization, invalid-base guarding)
  - B5: bounded trig sum-to-product core for two-term `sin/cos` sums/differences with zero-target branch splitting
  - recognized-family unresolved messaging now avoids generic unsupported fallback for mixed-base logs and bounded trig sum-to-product non-zero cases
  - required manual checklist artifacts added for B4 and B5
- Closed the gate with full regression checks and solve-note readability cleanup that strips raw LaTeX wrappers from summary text.

## Current Known Risks
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Broader log transforms (`ln(u)-ln(v)`, ratio/power forms) remain intentionally out of bounded scope and should keep explicit unsupported messaging.
- Bounded trig sum-to-product currently covers two-term `sin/cos` forms only; broader harmonic families remain deferred.

## Pending Verification
- Optional visual-only spot-check in desktop UI for final copy polish on the new `Solve note` block.
- Keep the Track E manual checklist in parallel:
  - `.memory/research/TRACK-E-MANUAL-VERIFICATION-CHECKLIST.md`
- Re-check `git_plan.ps1` after the first real commit and first upstream push exist.

## Next Recommended Task
- Choose the next bounded follow-up:
  - Track B continuation for additional bounded trig families beyond two-term sum-product
  - or Track A continuation for broader log transforms beyond combine-only scope
