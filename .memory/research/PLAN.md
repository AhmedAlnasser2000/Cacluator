# Staged CAS Keyboard Activation Plan for Calcwiz

## Summary
Extend the calculator into a CAS-heavy product by replacing the current generic MathLive virtual keyboard with **custom milestone-gated keyboard layers**. Only the symbols and functions for the current milestone will be visible and active. Each milestone will close only when:
- the relevant keyboard pages are curated,
- the inserted symbols map to real behavior or intentionally-supported input semantics,
- duplicate/confusing symbols are resolved for that slice,
- and a **guided lesson** is delivered for you explaining what the new symbols mean and how to use them.

Locked decisions from this planning pass:
- Rollout strategy: `Core First`
- First functional slice: `Algebra Core`
- Keyboard policy: `Curated Active`
- Keyboard architecture: `Custom Layers`
- Milestone completion bar: `Behavior + Guide`
- User education format after each milestone: `Guided Lessons`

## Current Baseline
From the current repo and video review:

- The app uses `MathLive`, but **does not define custom virtual keyboard layouts**. The math field in [MathEditor.tsx](c:/Users/ahmed/Downloads/Cacluator/src/components/MathEditor.tsx) mounts with minimal configuration.
- The virtual keyboard shown in the recording is essentially the **default MathLive keyboard**, not a calculator-specific curated keyboard.
- The CAS engine in [math-engine.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/math-engine.ts) is still relatively narrow:
  - `simplify`
  - `factor`
  - `expand`
  - `evaluate`
  - `solve`
  - table evaluation
- The custom keypad in [menu.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/menu.ts) is still much smaller than the virtual keyboard.
- This creates a mismatch:
  - the virtual keyboard visually suggests many capabilities,
  - but many visible symbols are not yet backed by calculator workflows.
- Duplicate/confusing symbols currently come from default MathLive category organization, not from a curated product model.

This plan fixes that mismatch before broadly expanding CAS behavior.

## Product Direction
The calculator will treat the virtual keyboard as a **mode-aware CAS workspace**, not as a generic symbol dump.

Design rules:
- The appliance-style on-screen keypad remains the primary everyday keypad.
- The virtual keyboard becomes the **advanced math notation surface**.
- The virtual keyboard will no longer expose default MathLive pages wholesale.
- Each milestone unlocks only the relevant keyboard pages and symbols.
- Unsupported future symbols are **hidden**, not shown as dead weight.
- Similar symbols are separated by **meaning**, not just glyph:
  - `Σ` as a Greek letter belongs to letters/Greek
  - `∑` as a summation operator belongs to discrete math
- Alternate glyph variants are exposed through **variants/long-press**, not duplicate primary keys.

## Architecture Decisions

### Keyboard Model
Replace the current implicit/default keyboard with a custom keyboard registry.

Add these types:

```ts
export type CapabilityId =
  | 'keyboard-foundation'
  | 'algebra-core'
  | 'discrete-core'
  | 'calculus-core'
  | 'linear-algebra-core';

export type SupportLevel = 'hidden' | 'insert' | 'numeric' | 'symbolic';

export type KeyboardContext = {
  mode: ModeId;
  equationScreen?: EquationScreen;
  enabledCapabilities: CapabilityId[];
};

export type KeyboardAction =
  | { kind: 'insert-latex'; latex: string }
  | { kind: 'insert-template'; latex: string }
  | { kind: 'execute-command'; command: string }
  | { kind: 'open-page'; pageId: string };

export type KeyboardKeySpec = {
  id: string;
  label: string;
  action: KeyboardAction;
  capability: CapabilityId;
  supportLevel: SupportLevel;
  pageId: string;
  modeVisibility?: ModeId[];
  equationVisibility?: EquationScreen[];
  variants?: KeyboardKeySpec[];
  duplicateGroup?: string;
  lessonRef?: string;
};

export type KeyboardPageSpec = {
  id: string;
  label: string;
  capability: CapabilityId;
  rows: KeyboardKeySpec[][];
};

export type LessonSpec = {
  id: string;
  milestone: string;
  title: string;
  concepts: string[];
  examples: {
    title: string;
    steps: string[];
    expected: string;
  }[];
  pitfalls: string[];
};
```

### Keyboard Runtime Behavior
Implementation will use MathLive’s official virtual keyboard customization APIs:
- `mathVirtualKeyboard.layouts`
- custom layout/layer definitions
- key variants for alternate glyphs
- optional manual visibility control if needed

Official references:
- MathLive virtual keyboard guide: https://mathlive.io/mathfield/guides/virtual-keyboard
- MathLive virtual keyboard overview: https://mathlive.io/mathfield/virtual-keyboard/
- Mathfield API reference: https://mathlive.io/mathfield/api

### Duplicate Governance
Every symbol must belong to one of these categories:
- `primary visible key`
- `variant of another key`
- `hidden until later milestone`

Rules:
- No two primary keys with the same mathematical role may appear on the same page.
- Glyph variants like `ϵ/ε`, `φ/ϕ`, `θ/ϑ`, `ρ/ϱ`, `π/ϖ` must not consume multiple primary slots unless the milestone explicitly teaches both.
- Greek letter pages and operator pages must be separated by semantics, not just appearance.
- The summation operator `∑` must never be presented as a duplicate of Greek sigma `Σ`.

## File and Module Plan

### New files
- `src/lib/virtual-keyboard/catalog.ts`
- `src/lib/virtual-keyboard/layouts.ts`
- `src/lib/virtual-keyboard/capabilities.ts`
- `src/lib/virtual-keyboard/dedup.ts`
- `src/lib/virtual-keyboard/lessons.ts`
- `src/lib/virtual-keyboard/catalog.test.ts`
- `src/lib/virtual-keyboard/layouts.test.ts`
- `src/lib/virtual-keyboard/dedup.test.ts`
- `docs/guides/milestone-00-keyboard-foundation.md`
- `docs/guides/milestone-01-algebra-core.md`
- `docs/guides/milestone-02-discrete-core.md`
- `docs/guides/milestone-03-calculus-core.md`
- `docs/guides/milestone-04-linear-algebra-core.md`

### Existing files to update
- [MathEditor.tsx](c:/Users/ahmed/Downloads/Cacluator/src/components/MathEditor.tsx)
- [App.tsx](c:/Users/ahmed/Downloads/Cacluator/src/App.tsx)
- [App.css](c:/Users/ahmed/Downloads/Cacluator/src/App.css)
- [menu.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/menu.ts)
- [math-engine.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/math-engine.ts)
- [format.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/format.ts)
- mode modules as needed:
  - [calculate.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/modes/calculate.ts)
  - [equation.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/modes/equation.ts)
  - [matrix.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/modes/matrix.ts)
  - [vector.ts](c:/Users/ahmed/Downloads/Cacluator/src/lib/modes/vector.ts)

### No backend changes required initially
The first milestones should remain frontend- and TS-engine-driven.
No new Tauri commands are required for keyboard curation itself.

## Milestone Roadmap

## Milestone 0 — Keyboard Foundation and Curation
Purpose: replace the generic virtual keyboard with a controlled product keyboard before expanding CAS depth.

### Scope
- Replace default MathLive layouts with custom layers.
- Keep only milestone-backed pages visible.
- Add duplicate governance.
- Preserve current working editing ergonomics:
  - copy expression
  - copy result
  - paste
  - send result to editor
- Keep current custom calculator keypad intact.
- Add a compact “how to navigate the keyboard” lesson.

### Pages enabled
- `Core`
- `Letters`
- `Greek`

### Symbols active
- digits, decimal point, signs
- parentheses
- fraction
- square root
- power
- `x`, `y`, `a`, `b`, `c`, `n`
- `π`, `e`
- a curated Greek subset as variables only

### Duplicate policy in this milestone
- `ε/ϵ`, `φ/ϕ`, `θ/ϑ`, `ρ/ϱ`, `π/ϖ` appear as variants, not separate first-class keys
- `Σ` may appear on Greek page as a letter
- `∑` is hidden until Discrete milestone
- `σ` and `ς` do not both consume main slots

### Acceptance criteria
- The virtual keyboard no longer shows raw default MathLive pages.
- Only curated pages are visible.
- No obvious duplicate/confusing symbol pairs appear on primary keys.
- Existing current behavior still works for currently supported inputs.
- A guided lesson exists for keyboard navigation, pages, variants, and copy/paste workflows.

## Milestone 1 — Algebra Core
Purpose: make the calculator feel genuinely CAS-capable for algebraic manipulation.

### Scope
Activate algebra notation and algebra-backed behavior.

### Pages enabled
- `Core`
- `Algebra`
- `Relations`
- `Letters`
- `Greek`

### Symbols/functions active
- exact fractions
- roots and nth roots
- powers and subscripts
- absolute value
- equality and relation operators:
  - `=`, `≠`, `<`, `>`, `≤`, `≥`
- variables and symbolic identifiers
- `Ans`, `π`, `e`

### CAS behavior required
- simplify
- factor
- expand
- numeric evaluation
- symbolic solve in `Equation`
- explicit exact/approx dual output where already supported
- algebra input must render textbook notation, not raw parser text

### Explicitly out of scope for this milestone
- summation/product operators
- factorial/combinatorics
- calculus operators
- matrix/vector templates in the math editor
- assumptions system
- piecewise/logic/set notation

### User lesson deliverable
`docs/guides/milestone-01-algebra-core.md`

Lesson must include:
- what each new algebra key means
- when to use `simplify`, `factor`, `expand`
- 5 worked examples
- common mistakes:
  - confusing `x^2` with `(x)^2`
  - entering equality in `Calculate`
  - exact vs numeric expectations

### Acceptance criteria
- Algebra pages are visible only after this milestone.
- All visible algebra keys insert correct textbook templates.
- Every visible algebra key is either behavior-backed or intentionally variable-only.
- No duplicate algebra symbol clutter on primary pages.
- Lesson is complete and understandable for a novice user.

## Milestone 2 — Discrete Core
Purpose: activate the sum/product/combinatorics family that currently looks available but is not productized.

### Pages enabled
- `Discrete`
- `Combinatorics`
- plus all Milestone 1 pages

### Symbols/functions active
- summation `∑`
- product `∏`
- factorial `!`
- `nCr`
- `nPr`
- optional integer helpers if implementation is solid:
  - `mod`
  - `gcd`
  - `lcm`

### CAS behavior required
- bounded finite sums with explicit numeric bounds
- bounded finite products with explicit numeric bounds
- exact factorial for non-negative integers
- exact `nCr` and `nPr` for valid integer inputs
- controlled error messages for invalid domains:
  - negative factorial
  - non-integer combinatorics arguments
  - malformed sum/product bounds

### Symbol governance for this milestone
- `∑` appears only on Discrete
- `Σ` remains a letter on Greek
- no duplicate “sum-like” primary symbols across pages

### User lesson deliverable
`docs/guides/milestone-02-discrete-core.md`

Lesson must explain:
- `Σ` vs `∑`
- `∏` vs multiplication
- factorial, permutations, combinations
- 5 worked examples with exact results
- domain restrictions and invalid-input cases

### Acceptance criteria
- Discrete keys are present only after the milestone.
- Sum/product templates include structured placeholders for index, lower bound, upper bound, and body.
- `∑` and `∏` behave numerically and predictably.
- `nCr`, `nPr`, `!` are exact and validated.
- Lesson clearly teaches the meaning of each new operator.

## Milestone 3 — Calculus Core
Purpose: make the calculator meaningfully CAS-heavy for derivatives, integrals, and limits.

### Pages enabled
- `Calculus`
- `Functions`
- plus prior milestone pages

### Symbols/functions active
- derivative `d/dx`
- derivative-at-point template
- indefinite integral
- definite integral
- limit
- common function notation if not already present:
  - `sin`, `cos`, `tan`, `log`, `ln`

### CAS behavior required
- symbolic derivative where Compute Engine supports it
- numeric derivative at a point fallback if symbolic form is unavailable
- symbolic indefinite integral where supported
- numeric evaluation for definite integrals where symbolic result is unavailable
- limit support only for clearly supported cases; otherwise controlled message
- output must distinguish exact symbolic result from numeric approximation/fallback

### Explicitly out of scope for this milestone
- multivariable calculus
- Jacobians
- symbolic proof steps
- arbitrary advanced assumptions

### User lesson deliverable
`docs/guides/milestone-03-calculus-core.md`

Lesson must explain:
- derivative vs derivative-at-point
- indefinite vs definite integral
- what a limit means
- symbolic vs numeric fallback expectations
- 5 worked examples, including one fallback example

### Acceptance criteria
- Calculus keys insert proper templates with placeholders.
- Supported cases solve reliably.
- Unsupported symbolic cases fail cleanly.
- Numeric fallback is clearly labeled.
- Lesson explains the operators in plain language.

## Milestone 4 — Linear Algebra Core
Purpose: activate matrix/vector notation in the math editor so keyboard capability matches existing matrix/vector app power.

### Pages enabled
- `MatrixVec`
- plus prior milestone pages

### Symbols/functions active
- matrix template
- vector template
- transpose
- determinant
- inverse
- dot product
- cross product
- norm

### CAS behavior required
- templates insert correctly in textbook notation
- integration with existing Matrix and Vector modes
- matrix/vector operations continue to work in their dedicated modes
- editor-side notation must not mislead the user into unsupported free-form matrix CAS if not yet implemented

### Governance rule
If a notation is editor-insertable but not fully free-form solvable, it must be clearly scoped to the relevant mode or documented as template-only.

### User lesson deliverable
`docs/guides/milestone-04-linear-algebra-core.md`

Lesson must explain:
- matrix vs vector entry
- determinant, inverse, transpose
- dot/cross/norm
- which tasks belong in `Matrix`/`Vector` modes versus free-form input

### Acceptance criteria
- Matrix/vector keyboard pages exist and are curated.
- Notation and dedicated-mode behavior are aligned.
- No duplicated matrix/vector operators across unrelated pages.
- Lesson clearly teaches when to use each operation.

## Keyboard Layout Policy

### Persistent design rules
- The virtual keyboard complements the calculator keypad; it does not replace it.
- Basic digits/operators stay on the calculator keypad and compact `Core` virtual page.
- Advanced notation lives on domain pages.
- Every page must fit a coherent mental model:
  - `Core`
  - `Algebra`
  - `Relations`
  - `Letters`
  - `Greek`
  - `Discrete`
  - `Combinatorics`
  - `Calculus`
  - `Functions`
  - `MatrixVec`

### Variant policy
Use variants for:
- alternate Greek glyphs
- alternate letter shapes
- rare notation tied to a main symbol

Do not use separate primary keys for variants unless:
- the milestone explicitly teaches both,
- and both have distinct practical use in the product.

### Mode-aware visibility
Keyboard pages should be filtered by context:
- `Calculate`: `Core`, active domain pages, letters/Greek as allowed
- `Equation`: `Core`, `Algebra`, `Relations`, later `Discrete`, `Calculus`
- `Matrix`: `Core`, `MatrixVec`
- `Vector`: `Core`, `MatrixVec`
- `Table`: `Core`, `Functions`, limited letters

## Data Flow

### On focus
When a math field gains focus:
1. Determine current mode and equation screen.
2. Determine active milestone capabilities.
3. Build the visible keyboard page list from the registry.
4. Set `mathVirtualKeyboard.layouts` to those custom layouts.

### On key press
A keyboard key does exactly one of:
- insert LaTeX
- insert a template
- execute an app command
- open another page/layer if needed

### On evaluation
The app evaluates only behavior-backed features for the current milestone.
Hidden future keys are absent, not teased.

### On unsupported expression
If a visible symbol produces an expression that is syntactically valid but beyond current CAS behavior:
- return a controlled message specific to the domain
- do not expose parser internals
- do not silently degrade into nonsense output

## Public Interface and Behavior Changes

### `MathEditor`
Update [MathEditor.tsx](c:/Users/ahmed/Downloads/Cacluator/src/components/MathEditor.tsx) so it:
- applies custom MathLive keyboard layouts on focus
- accepts per-context layout definitions
- optionally uses manual keyboard policy if that gives cleaner desktop behavior
- keeps smart fencing and structured insertion behavior

### Keyboard Registry
Create a single source of truth for:
- what symbols exist
- where they appear
- whether they are visible now
- whether they are insert-only, numeric, or symbolic
- which lesson explains them

### CAS Support Mapping
Each milestone must explicitly map keys to one of:
- `insert-only`
- `numeric`
- `symbolic`

That mapping must be testable and must prevent accidental symbol exposure without support.

## Test Cases and Scenarios

## Global tests
- default MathLive layouts are no longer visible
- only curated pages appear
- no duplicate primary keys within a page
- duplicate groups are enforced across active layouts
- page visibility changes correctly by mode and milestone
- copy/paste/edit ergonomics still work

## Milestone 0 tests
- `Σ` is on Greek only if intended as a letter
- `∑` is not visible yet
- `ε/ϵ` and similar pairs are variants, not duplicate keys
- focusing different math fields updates layouts appropriately

## Milestone 1 tests
- algebra templates insert valid textbook LaTeX
- `simplify`, `factor`, `expand`, `numeric` still work
- relations/operators display cleanly
- variable symbols act as variables, not malformed text
- exact vs numeric display remains correct

## Milestone 2 tests
- `∑_{k=1}^{5} k` evaluates correctly
- `∏_{k=1}^{4} k` evaluates correctly
- `5!`, `\binom{5}{2}`, and `nPr` forms return exact values
- invalid factorial/combinatorics inputs return controlled errors
- `Σ` and `∑` are not confused in the UI

## Milestone 3 tests
- derivative template inserts correctly
- supported symbolic derivatives work
- derivative-at-point numeric fallback works
- definite integral fallback works when symbolic result is unavailable
- limit errors are controlled and readable

## Milestone 4 tests
- matrix/vector templates insert correctly
- relevant operations still work in Matrix/Vector modes
- editor notation does not expose unsupported fake behavior

## Manual acceptance scenarios
- browse keyboard pages without seeing noisy duplicates
- enter an expression using only the virtual keyboard
- copy a result and send it back to an editor
- move from `Calculate` to `Equation` without keyboard confusion
- follow the guided lesson for the milestone and reproduce the examples successfully

## Guided Lesson Requirement After Every Milestone
Each milestone must end with a user-facing lesson written for a non-expert.

Required lesson structure:
1. What changed in this milestone
2. What each new symbol means
3. Where to find it on the keyboard
4. 3 to 5 worked examples
5. Common mistakes
6. Exact vs numeric expectations
7. Which modes are best for that symbol family

These lessons are part of the milestone definition, not optional documentation.

## Rollout Rules
- Never expose future-domain keys early.
- Never leave duplicate/confusing primary symbols on active pages.
- If a symbol is visible, it must be either:
  - behavior-backed for that milestone, or
  - intentionally variable/notation-only and explained in the lesson.
- A milestone is not complete until the lesson is delivered.

## Assumptions and Defaults
- The virtual keyboard remains visible on desktop and is part of the intended UX.
- Custom layers are preferred over filtering the default MathLive keyboard.
- Unsupported future symbols stay hidden rather than greyed out.
- Variants are accessed by long-press where useful.
- `Core` pages remain small and ergonomic; advanced CAS content moves to domain pages.
- The rollout order is:
  1. Keyboard Foundation
  2. Algebra Core
  3. Discrete Core
  4. Calculus Core
  5. Linear Algebra Core
- No backend/Rust changes are required to begin this roadmap.
- If a later milestone reveals Compute Engine limits, numeric fallback is acceptable where explicitly designed and clearly labeled.

## Dedicated Multi-Track Roadmap (2026-03-05)

This roadmap is intentionally split by focus area. It is not a single "finish the whole app" plan.

### Track A - Solver and Equation
1. Range Guard v2 (broader impossible-case proofs with precise messages).
2. Symbolic substitution expansion (`tan^2`, wider trig/exp quadratics, inverse-isolation coverage).
3. Numeric solver v2 (better interval guidance, non-bracket/even-multiplicity handling, stronger candidate reporting).

Expected outcome:
- `Equation > Symbolic` becomes the strongest single-variable real guarded-solve surface.

### Track B - Trigonometry Core
1. AST normalization v2 for equivalent symbolic forms.
2. Bounded trig equation family expansion on top of the shared Equation backend.
3. Bounded symbolic trig toolkit growth (still not full CAS).

Expected outcome:
- Trigonometry accepts more symbolic forms and solves more practical bounded trig equations reliably.

### Track C - Geometry Core
1. Expression-capable geometry inputs across core fields.
2. Bounded solve-for-missing workflows where algebraically safe.
3. Coordinate-geometry expansion with cleaner Equation handoff when useful.

Expected outcome:
- Geometry evolves from formula calculators into a stronger geometry-solving workspace.

### Track D - Statistics Core
1. Data/frequency reliability pass and stronger source-state UX.
2. Bounded inferential basics.
3. Regression/correlation diagnostics and model feedback improvements.

Expected outcome:
- Statistics becomes more decision-grade while staying bounded and explicit.

### Track E - Error Semantics and UX Consistency (cross-core lane)
Scope clarification:
- This is not "make all error messages the same."
- It standardizes failure taxonomy and UX shape while preserving mathematically distinct meanings.

Core classes:
- Impossible over reals.
- Domain violation.
- Unsupported family.
- Numeric interval issue.
- Parse/canonicalization issue.

Expected outcome:
- Users can trust why something failed and what to do next, without misleading generic errors.

## Recommended sequencing from current state
- Primary sequence: Track A -> Track B -> Track C -> Track D.
- Keep Track E as a parallel quality lane across all tracks.

## Track R Completion (as of 2026-03-05)

Current status:
- `R0` through `R7` are complete.
- `src/App.tsx` is now a thin shell (`App.css` + `AppMain`) and stays below the `<= 4000` target.
- Runtime orchestration currently sits in `src/AppMain.tsx` (`9394` lines after the latest extraction pass).
- `src/App.css` is reduced to an `11`-line import manifest over `src/styles/app/*`.
- Compatibility facades remain stable for:
  - `src/lib/equation/substitution-solve.ts`
  - `src/lib/equation/guarded-solve.ts`
  - `src/lib/trigonometry/rewrite-solve.ts`
  - `src/lib/guide/content.ts`
  - `src/types/calculator.ts`

Closed milestones:

1. `R1` App presentation extraction
- Workspace rendering is split across `src/app/workspaces/*`.
- Preview rendering helper is split into `src/app/components/GeneratedPreviewCard.tsx`.

2. `R2` Action routing extraction
- Expression, primary-action, soft-action, and keypad routing live in `src/app/logic/*`.

3. `R3` Focus/reset/guide/app-flow extraction
- Focus routing, reset behavior, guide routing, and replay/clear/example flow helpers live in `src/app/logic/*`.

4. `R4` CSS decomposition
- Styles are split into the planned partials under `src/styles/app/*` while keeping the original cascade behavior.

5. `R5` Solver decomposition
- Equation substitution, guarded solve, and trig rewrite internals are split into module folders with stable barrel wrappers.

6. `R6` Guide content decomposition
- Guide article payloads/selectors are split by domain under `src/lib/guide/content/*` with unchanged public selectors.

7. `R7` Type-system decomposition
- Calculator types are split by domain under `src/types/calculator/*` while `src/types/calculator.ts` remains the stable facade.

Verification gate used to close Track R:
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`

Manual verification artifacts now present:
- `.memory/research/REFACTOR-R0-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R1-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R2-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R3-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R4-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R5-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R6-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/REFACTOR-R7-MANUAL-VERIFICATION-CHECKLIST.md`

Anything beyond this point is no longer Track R. Future work would be optional typing cleanup or product-track work, not more required decomposition for this sweep.

## Next CAS Pillar - Exact Algebra Core (roadmap note, 2026-03-07)

### Why this roadmap exists
Calcwiz now has a much stronger guarded solve stack, bounded trig expansion, geometry solve-missing, and bounded statistics workflows, but it still does not have an app-owned exact algebra normalization layer for rational and radical math.

That gap is now large enough that it blocks any serious "general-purpose CAS" claim.

Current practical symptoms:
- fraction sums and rational expressions do not consistently normalize to a common exact form
- denominator exclusions are not carried as first-class constraints through simplification and solving
- radical expressions do not yet have a dedicated simplification/rationalization layer
- rational and radical equations cannot yet use bounded algebra stages like LCD clearing, conjugate transforms, and extraneous-root filtering as a shared workflow

Concrete example of the current gap:
- `1/3 + 1/(6x)` should reliably normalize to `(2x+1)/(6x)` with `x != 0`
- that requires exact symbolic denominator management, not only generic simplify/factor/expand calls

### Benchmark note
For this area, the relevant external comparison is not only Casio's ordinary scientific/graphing calculators.

Two comparison classes matter:
- `fx-CG50` / ClassWiz-style tools:
  - useful for exact fractions and some simplification workflows
  - not the right ceiling for CAS-grade algebra
- `ClassPad` CAS:
  - relevant benchmark family for symbolic combine/simplify/expand/factor/solve expectations

This means the next algebra roadmap should target ClassPad-style symbolic algebra expectations more than ordinary fraction-only calculator behavior.

### Current baseline inside this repo
- `Calculate` symbolic actions still route mainly through the generic symbolic pipeline in `src/lib/math-engine.ts`
- there is bounded app-owned symbolic work for:
  - factoring fallback
  - guarded equation solving
  - trig normalization/rewrite families
  - derivative/partial/integral/limit subsystems
- there is not yet a dedicated exact algebra layer for:
  - rational normalization
  - radical normalization
  - denominator-domain tracking
  - conjugate-based transforms
  - rational/radical equation solve stages

### Scope of the next algebra roadmap
This roadmap should be treated as a dedicated algebra-core track, not as scattered one-off simplify fixes.

It has four major pillars.

#### Pillar 1 - Exact rational normalization
Build an app-owned rational-expression normalization layer that can:
- detect symbolic numerators and denominators structurally
- compute common denominators for bounded algebraic families
- combine fractions exactly without decimal fallback
- normalize signs and canonical numerator/denominator placement
- cancel common factors only when mathematically safe
- preserve denominator exclusion constraints such as `x != 0`

Target capabilities:
- symbolic LCD/LCM handling for bounded polynomial/rational forms
- rational combine in `Calculate`
- rational preprocessing before `Equation` solve when the transform is exact and safe
- plain-readable exact output instead of raw or partially decimalized artifacts

#### Pillar 2 - Exact radical normalization
Build a bounded radical-expression layer that can:
- simplify radicands by extracting perfect powers
- normalize nested simple radical products and quotients
- rationalize denominators using conjugates where the transform is exact and bounded
- enforce even-root real-domain guards before and after transforms

Target capabilities:
- `sqrt(12)` -> `2sqrt(3)`
- bounded denominator rationalization such as `1/sqrt(3)` -> `sqrt(3)/3`
- controlled conjugate transforms for simple binomial radical denominators
- exact messaging when a radical transform is outside the bounded safe set

#### Pillar 3 - Rational and radical equation solving
Extend the guarded solve architecture so rational/radical equations can use exact algebra stages before fallback.

Planned solve-stage tools:
- multiply by LCD with excluded-value tracking
- radical-isolation plus bounded power/conjugate transforms where exact
- solve transformed equation
- validate every candidate against the original equation and domain constraints
- reject extraneous roots explicitly

This should remain consistent with the existing guarded-solve philosophy:
- exact first
- domain-aware
- candidate-validated
- interval numeric solve only when symbolic stages stop short

#### Pillar 4 - Algebra transform UX and provenance
The algebra layer should not hide every transformation inside a vague `Simplify` button.

Later planning should decide which transforms are:
- automatic inside `Simplify`
- explicit actions such as:
  - `Combine Fractions`
  - `Cancel Factors`
  - `Use LCD`
  - `Rationalize`
  - `Conjugate`

UX rule:
- summaries must stay human-readable
- do not expose raw LaTeX control wrappers like `\left`, `\right`, or parser internals in user-facing summaries
- exact output, approximate output, domain warnings, and exclusion constraints must remain distinct

### Guardrails for this roadmap
This algebra roadmap should stay aligned with the rest of Calcwiz:
- single-variable real algebra first
- exact symbolic normalization before broader automation
- domain constraints tracked as first-class data, not dropped side effects
- no broad theorem-prover/CAS search in the first pass
- no silent transformation that changes the mathematical domain without explicit tracking

Critical domain classes for this track:
- denominator nonzero constraints
- even-root radicand nonnegative constraints
- log-argument positivity when algebra transforms touch log forms
- excluded roots created by LCD clearing or rationalization stages

### Likely milestone shape for later planning
This is not yet a locked implementation plan, but the natural milestone shape is:

1. Rational normalization core
- exact fraction combine
- LCD/LCM/GCF handling
- exclusion constraints

2. Radical normalization core
- radicand simplification
- factor extraction
- denominator rationalization
- conjugates

3. Rational/radical equation solving
- algebraic preprocessing
- excluded-value tracking
- extraneous-root filtering

4. Algebra UX/provenance pass
- readable summaries
- explicit transform controls where needed
- exact-vs-approx/domain presentation cleanup

### Outcome if this roadmap is delivered well
If this algebra-core roadmap is completed well, Calcwiz gains the next major CAS pillar after guarded solving:
- stronger exact simplification in `Calculate`
- stronger preprocessing and candidate filtering in `Equation`
- better handling of rational, radical, and fractional textbook algebra
- a more credible path toward a real general-purpose CAS identity

Without this roadmap, Calcwiz can still be a strong bounded symbolic calculator, but it will remain materially short of full CAS expectations for everyday algebra.

## Next Roadmap After Exact Algebra Core `R1`-`R5`

With bounded rational/radical normalization, transform UX, and monomial/binomial solve expansion now shipped, the next preferred roadmap is a combined settings + power/root/log track rather than another immediate rational/radical expansion.

### Stage 1 - `SX1` Settings Foundation
Status: shipped on 2026-03-10 and corrected by `SX1.1` on 2026-04-03.

Build the canonical app settings surface first.

Delivered:
- add a dedicated settings surface that is not buried inside `Menu`
- give visibility/readability controls a permanent home
- give symbolic display preferences a permanent home before hard-coding one style
- use a hybrid presentation:
  - docked right inspector on wide layouts
  - right overlay sheet on narrower layouts
- keep top-row quick toggles as shortcuts over the same persisted state
- persist symbolic display preferences now, with broad formatting changes deferred to `PRL1`

First settings groups:
- `Display`
- `Symbolic Display`

First controls:
- UI scale
- math size
- result size
- high contrast
- symbolic preference mode:
  - prefer roots
  - prefer powers
  - auto
- flatten nested roots when safe

`SX1.1` correction delivered:
- `Settings` and `History` now use a shared right-side rail outside the calculator shell when real spare gutter space exists
- the calculator shell no longer truncates to make room for side surfaces
- overlay remains the fallback when the window does not have enough spare side room

### Stage 2 - `PRL1` Power / Root / Log Display Normalization
Status: shipped on 2026-04-03.

Fix how exponents, roots, and logs are shown before broadening their capabilities.

Delivered:
- added a bounded display-only normalization layer for selected rendered exact-math surfaces
- made `Symbolic Display` settings live on result rendering instead of preview-only
- kept copy/editor/history flows on the raw engine exact LaTeX for safety
- normalized selected awkward/nested root-power forms while keeping familiar plain roots unchanged
- added light notation cleanup for `\ln` and base-10 `\log`

Example direction:
- prefer `⁶√x` over root-of-root output when safe
- prefer `x√x` over `√(x^3)` when safe
- keep exact real-domain conditions explicit when display rewrites depend on them

### Stage 3 - `PRL2` Broad Numeric Exponent / Root / Log Support
Status: shipped on 2026-04-03.

Delivered:
- added a shared app-owned real numeric evaluator for bounded power/root/log families
- broadened `Calculate` numeric evaluation across real-domain powers, nth roots, and explicit-base logs
- broadened `Table` sampling with per-row `undefined` handling plus one table-level warning for real-domain exits
- added guided inserts for explicit-base `log_a(...)` and exposed the `Algebra` page in `Table`

Policy retained:
- numeric support is broad
- symbolic support remains bounded and branch-safe

### Stage 4 - `PRL3` Bounded Symbolic Exponent / Root / Log Support
Status: shipped on 2026-04-03.

Broaden symbolic transformations carefully after display policy and numeric foundations are stable.

Goals:
- safe power/root simplification
- safe inverse exp/log transforms
- same-base log rules only where branch/domain safety is explicit
- no broad symbolic identities that hide domain changes

Delivered:
- added an app-owned bounded symbolic normalization layer for power/root/log exact output and condition tracking
- standardized raw exact output toward canonical power-leaning forms while preserving simple familiar roots
- added `Rewrite as Root`, `Rewrite as Power`, and `Change Base` to the shared algebra tray
- added bounded same-base log combine under `Calculate > Simplify`
- added Equation preprocessing for notational variants that map into already-supported solver carriers without broadening solve scope

### Stage 5 - `PRL4` Bounded Solve Expansion
Status: shipped on 2026-04-03.

Broaden solve behavior for power/root/log equations on top of the earlier PRL stages.

Delivered:
- added bounded same-base equality solving for exponential, natural-log, and explicit-base log families
- added bounded equation-side same-base log quotient preprocessing
- added aggressive-but-bounded mixed-base log solving when change-of-base yields exact rational coefficient structure
- added bounded two-sided radical/rational-power isolation with one safe lift before guarded recursion
- preserved explicit numeric guidance for recognized mixed-base families that still fall outside bounded exact symbolic support

Policy retained:
- still real-domain only
- still Equation-first
- broader `Calculate` log difference/quotient simplify remains deferred
- no Lambert W, variable log bases, unrestricted log identities, or general nested-radical solving

### Guiding Principle
For this whole roadmap:
- numeric behavior should be broad
- symbolic behavior should stay conservative
- real domain remains the default
- transformed candidates must still validate against the original expression/equation and preserved constraints

## Next Solver Roadmap Candidate - Composition and Nested Function Solving (2026-04-04)

### Why this roadmap exists
Calcwiz now has a much stronger bounded solve stack for:
- rational and radical algebra
- powers, roots, and logs
- same-base and bounded mixed-base equation families

But it still has a visible capability gap around **composition**:
- outer functions applied to nontrivial inner carriers
- nested carriers that should reduce into already-supported solve families
- range-aware impossibility detection for composite expressions

Typical examples of the gap:
- `sin(cos x)=1`
- `ln(x^2+1)=3`
- `sqrt(ln(x+1))=2`
- `exp(sqrt(x))=5`

Today many of these either stop too early, surface unsupported-family messaging, or miss mathematically clean impossibility proofs that follow from simple range/image reasoning.

### Product direction
This roadmap should be treated as a dedicated **bounded composition solver** track, not as scattered one-off fixes.

Guiding principles:
- real-domain only
- bounded outer inversion first
- recurse only into already-supported inner families
- preserve all domain/image restrictions as first-class conditions
- reject impossible composites explicitly when range/image analysis is enough
- prefer honest numeric guidance over fake symbolic success when the bounded symbolic path stops short

### Milestone sequence

#### `COMP1` - Bounded Outer-Function Inversion and Image Guards
Purpose:
- teach `Equation > Symbolic` to recognize `f(g(x))=c` patterns and either invert the outer function safely or prove the target is impossible over the real domain.

In scope:
- one outer function over one inner carrier
- outer families:
  - `sin`
  - `cos`
  - `tan`
  - `ln`
  - `log_a` with constant valid base
  - `exp`
  - `sqrt`
  - bounded rational-power carriers
- range/image checks for bounded inner outputs where the contradiction is direct

Examples this milestone should handle well:
- `ln(x^2+1)=3`
- `sqrt(3x+2)=4`
- `exp(2x+1)=5`
- `sin(cos x)=1` -> explicit no-real-solution result from image/range reasoning
- `cos(sin x)=2` -> explicit no-real-solution result

Expected outcome by end of `COMP1`:
- the solver can isolate one outer layer safely
- direct impossibility cases no longer look unsupported
- nested equations that reduce into already-supported inner families start solving cleanly

#### `COMP2` - Nested Carrier Recursion Into Supported Families
Purpose:
- let bounded composite rewrites feed the inner equation back into the existing guarded algebra, trig, and PRL solve families instead of stopping after one inversion.

In scope:
- one recursive handoff after successful outer inversion
- inner carriers that reduce into already-supported families:
  - affine / polynomial algebra
  - PRL power/root/log families
  - bounded trig families already shipped
- preserved domain/image conditions through recursion

Examples this milestone should target:
- `ln(x^2+1)=3`
- `sqrt(ln(x+1))=2`
- `exp(sqrt(x))=5`
- `log_3((x+1)^2)=2`
- `sin(x^2)=0` only when the bounded recursion can map it into an already-supported exact family; otherwise explicit numeric guidance

Expected outcome by end of `COMP2`:
- nested carriers no longer feel like a dead end if each step is individually supported
- composition solving becomes a real extension of the guarded solver, not a separate one-off mechanism

#### `COMP3` - Composition Provenance, Conditions, and Honest Stops
Purpose:
- make composite solving readable and trustworthy in the UI.

In scope:
- dedicated provenance/summaries for:
  - outer inversion
  - image/range guard
  - nested recursion
  - candidate checked
- clearer condition lines for:
  - inner-domain restrictions
  - image restrictions
  - branch-safe outer inversions
- explicit recognized-but-unresolved messaging with numeric guidance where the composition family is understood but the bounded symbolic solver stops

Examples of the desired UX:
- `sin(cos x)=1` should explain that the inner image keeps `cos x` inside `[-1,1]`, making the target impossible for the outer sine
- `sqrt(ln(x+1))=2` should show both the outer inversion and the carried log-domain condition
- unresolved periodic composite cases should say the family is recognized but outside the current bounded symbolic depth, then offer numeric guidance rather than pretending they are unsupported syntax

Expected outcome by end of `COMP3`:
- composition-solving results read as deliberate math, not mysterious branch behavior
- impossible, exact, and recognized-but-unresolved composite cases are clearly separated for the user

#### `COMP4` - Parameterized Carrier Solving and Bounded Inverse-Trig Handoff
Purpose:
- finish the next class of periodic composition families after `COMP3` by solving bounded affine/power-form carriers against `k`-parameter trig families, and widen the composition surface to bounded inverse-trig outers.

In scope:
- parameterized periodic follow-on when the remaining carrier is:
  - `x`
  - `ax+b`
  - `(ax+b)^n` with constant integer `n` from `2` to `6`
- inverse-trig outers:
  - `arcsin`
  - `arccos`
  - `arctan`
- one bounded follow-on handoff after inverse-trig inversion
- unit-aware principal-range validation for non-radian inverse-trig targets

Examples this milestone should handle well:
- `sin(x^2)=1/2`
- `sin((2x+1)^3)=0`
- `arcsin(2x-1)=30`
- `arctan(ln(x+1))=45`

Expected outcome by end of `COMP4`:
- periodic follow-on can now finish exact families for bounded affine / pure power-form carriers instead of stopping at interval guidance
- inverse-trig outers become first-class bounded composition citizens in Equation
- broader nonlinear carriers like `sin(x^2+x)=1/2` remain explicitly recognized but unresolved, with honest structured guidance

#### `COMP5` - Deeper Periodic Nesting and Broader Bounded Inverse-Trig Follow-On
Purpose:
- push the Equation composition track into the next visible gap after `COMP4`: deeper nested periodic carriers and richer inverse-trig follow-on, while still staying bounded and real-domain only.

Status:
- shipped on 2026-04-05 as a bounded Equation-first milestone

In scope:
- deeper periodic composition when one periodic family feeds another structured carrier and the solver can still prune by image/range or bounded handoff
- broader inverse-trig enhancement inside Equation composition, including:
  - inverse-trig over already-supported trig/log/power carriers when principal-range checks stay finite and honest
  - better principal-range pruning and branch filtering after inverse-trig inversion
  - structured guidance plus suggested intervals when inverse-trig follow-on is recognized but still too deep to finish exactly
- nested periodic examples where the current solver can reduce one layer but still stops before the next structured reduction

Examples this milestone should target:
- `sin(cos(tan x))=c` for small reachable `c`
- `cos(sin(2x+1))=c` when the inner image keeps the outer target finite and bounded
- richer inverse-trig follow-on such as `arcsin(sin((2x+1)^3))=30` when principal-range filtering keeps the branch set honest
- clearer structured stops for cases that still exceed bounded exact closure after one or two reductions

Expected outcome by end of `COMP5`:
- more nested periodic textbook-style equations reduce further before stopping
- inverse-trig support moves beyond first-pass handoff and becomes more useful in real mixed trig/log/power compositions
- unresolved deep periodic cases still read as deliberate bounded stops with image/range context and practical numeric guidance

### Future split after `COMP5`
At this point the roadmap should separate clearly into two lanes:
- further Equation-composition expansion only if the remaining bounded symbolic gaps are still product-critical
- a dedicated calculus-composition lane for chain-rule structure, substitution-style antiderivatives, and composition-aware limits/domain behavior

#### `COMP6` - Reciprocal Trig, Stronger Periodic Pruning, and Canonical Inverse/Direct Trig Reduction
Purpose:
- continue the Equation-composition lane only where the repo already shows a clear bounded extension surface:
  - reciprocal trig composition (`sec`, `csc`, `cot`)
  - stronger image/range pruning before the solver declares a second periodic parameter unavoidable
  - cleaner canonical handling of nested inverse/direct trig identities when the bounded real-domain reduction is mathematically safe

In scope:
- reciprocal trig family generation and bounded handoff on top of the existing trig composition stage
- stronger pruning for nested periodic cases that may still collapse to a single practical parameter after image/range filtering
- canonical reductions such as bounded `arcsin(sin x)`, `arccos(cos x)`, and `arctan(tan x)` behavior when the principal-range story is explicit and the selected angle unit is preserved

Examples this milestone should target:
- `sec(cos x)=2`
- `cot(\ln(x+1))=1`
- bounded identity-style reductions such as `arctan(tan x)=45` where principal-range filtering is the real issue, not syntax

Expected outcome by end of `COMP6`:
- Equation composition gains the most natural remaining trig-family extensions without opening unrestricted multi-parameter periodic search
- nested trig/inverse-trig cases get cleaner bounded reductions before structured guidance is shown
- if the next step still truly needs multi-parameter periodic closure, the solver keeps stopping honestly

#### `CALC-COMP1` - Bounded Substitution Antiderivatives
Purpose:
- start the separate calculus-composition lane with the highest-payoff textbook gap already visible in the repo: substitution-style antiderivatives.

In scope:
- detect bounded `f(g(x)) * g'(x)` patterns in the antiderivative rule engine
- reuse the existing antiderivative families for the outer function once the inner derivative matches exactly or by a safe constant factor
- keep output symbolic, exact, and human-readable

Examples this milestone should target:
- `\sin(x^2) \cdot 2x`
- `e^{x^2} \cdot 2x`
- `(x^2+1)^5 \cdot 2x`
- `\frac{2x}{x^2+1}`

Expected outcome by end of `CALC-COMP1`:
- the calculus surface handles the first real composition family users expect from substitution
- the repo stops failing obvious chain-rule antiderivative inputs like `\sin(x^2) \cdot 2x`
- bounded calculus composition starts by reusing the existing symbolic rule engine instead of introducing a second unrelated subsystem

#### `CALC-COMP2` - Composition-Aware Derivative Structure and Chain-Rule Explanation
Purpose:
- make derivative output composition-aware and teachable, not just algebraically correct.

In scope:
- outer/inner decomposition for derivative results
- repeated chain-rule explanation for nested carriers
- clear principal-domain notes when inverse-trig or log/ root compositions matter

Examples this milestone should target:
- `\frac{d}{dx}\sin(x^2)`
- `\frac{d}{dx}\ln(\sqrt{x+1})`
- `\frac{d}{dx}\arctan(e^x)`

Expected outcome by end of `CALC-COMP2`:
- derivative workflows can explain composition structure in the same deliberate way Equation now explains bounded solve structure
- repeated chain-rule steps feel productized instead of hidden inside a final simplified expression

#### `CALC-COMP3` - Composition-Aware Limits and Domain/Image Reasoning
Purpose:
- extend the calculus lane from derivatives/integrals into composite limits and one-sided domain reasoning.

In scope:
- inner-domain checks before numeric fallback
- bounded image/range reasoning for common composite limit patterns
- clearer symbolic-vs-numeric limit fallback messaging when a composite expression is recognized but not fully solvable symbolically

Examples this milestone should target:
- `\lim_{x \to 0}\frac{\sin(x^2)}{x^2}`
- `\lim_{x \to 0}\frac{1-\cos(g(x))}{(g(x))^2}`
- `\lim_{x \to \infty}\arctan(\ln x)`

Expected outcome by end of `CALC-COMP3`:
- composite limits become the third calculus surface to reuse the same outer/inner structural reasoning developed across the composition roadmaps
- the calculus lane gains a coherent identity: substitution, chain-rule structure, and composition-aware limits all share one bounded composition philosophy

### Recommended boundary for the full roadmap
This composition track should remain bounded and should **not** promise:
- unrestricted multi-layer composition search
- general theorem-prover inversion
- arbitrary periodic family synthesis
- variable log bases
- complex-domain composition solving
- unrestricted nested radicals
- Lambert W or `x^x`-style transcendental families

### What success looks like at the end of the roadmap
If the Equation-composition lane through `COMP5` and the first calculus-composition lane (`CALC-COMP1`-`CALC-COMP3`) land well, Calcwiz should be able to:
- solve many practical `f(g(x))=c` equations in the real domain
- recurse through one nested carrier into already-supported solver families
- prove impossibility for common composite cases using image/range arguments
- preserve domain conditions and candidate validation throughout
- stop honestly, with explicit numeric guidance, when a composite family is recognized but exceeds the current bounded symbolic depth
- recognize and solve the first substitution-style antiderivatives built from `f(g(x)) \cdot g'(x)` patterns
- explain derivative and limit composition structure in a way that matches the bounded, provenance-heavy style already established in Equation

That would close one of the most visible remaining gaps between Calcwiz's current bounded solver and user expectations for nested textbook-style equations.
