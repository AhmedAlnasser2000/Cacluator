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
