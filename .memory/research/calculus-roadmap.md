# Calculus Roadmap

Date captured: 2026-04-24

Status: near-term roadmap recommendation. Each milestone still needs its own implementation plan and verification gate before it is treated as shipped.

## Roadmap Sync - 2026-04-25

`CALC-DIFF1` was inserted after `CALC-COMP1` to handle the derivative-readiness work that the original `CALC-COMP2` slot described. As shipped, `CALC-DIFF1` covers powered-function notation, nested chain-rule derivatives, general powers, known inverse derivative families, and visible derivative strategy badges.

The old `CALC-COMP2` slot is therefore no longer the next active milestone. Its remaining intent is limited to future derivative readback/domain polish if a later milestone discovers a concrete gap. `CALC-LIM1`, `CALC-LIM2`, and `CALC-LIM3` now cover the finite-limit strengthening arc: bounded composition/domain honesty first, typed directional targets and signed infinities second, then local rational behavior, elementary equivalents, rational dominance, and accurate limit method notes. `domain-range-CORE1` is inserted before `CALC-INT1` so definite-integral trust can depend on a shared real-domain/range substrate instead of calculus-local domain checks.

## Roadmap Thesis

Calcwiz should pause broad algebra expansion and make the shipped algebra work pay off inside calculus.

`CALC-*` milestones are product-calculus milestones. They are not a second algebra roadmap and should not hide algebra-core work inside calculus code.

The calculus lane should be built as a bounded reuse layer over the existing calculator foundations:
- exact polynomial and factor support
- powers, roots, logarithms, and exponentials
- radical and polynomial-radical follow-on logic
- absolute-value branch handling
- bounded composition and carrier recognition
- shared runtime envelopes, guards, and result-origin semantics

The goal is not to build a general CAS calculus engine. The goal is to make derivative, integral, limit, series, and Advanced Calc workflows feel more coherent, more exact where the existing cores allow it, and more honest when they stop.

## Why This Comes Next

The algebra lanes are now strong enough for v1:
- `POLY1`-`POLY2`
- `PRL1`-`PRL4`
- `RAD1`-`RAD2`
- `POLY-RAD1`-`POLY-RAD6`
- `ABS1`-`ABS5B`
- `COMP1`-`COMP12B`
- `ARCH1`-`ARCH6B`

Continuing algebra breadth now risks turning bounded exact solving into open-ended CAS scope. Calculus is the better next lane because it can reuse those exact substrates through narrower, user-visible workflows.

## Guardrails

- Keep calculus single-variable-first for the near-term lane.
- Starting after `CALC-CORE1`, every calculus capability milestone must declare the algebra, differentiation, domain, formatting, and result-surface dependencies it relies on before adding behavior.
- If a needed algebra core is missing, unstable, or too broad for the current bounded surface, stop the calculus milestone and plan the algebra prerequisite first instead of patching around it locally.
- Do not duplicate algebra recognition inside calculus when a shared core already exists or clearly should exist.
- Keep indefinite integration symbolic-only; do not add broad numeric fallback for antiderivatives.
- Do not implement Risch, full Liouville integration, general term rewriting, or open-ended symbolic search in stable code.
- Do not make calculus depend on Playground.
- Use Playground only for speculative search or broad algorithm experiments.
- Keep exact wins explainable by bounded rules, visible provenance, and derivative/check validation where practical.
- Keep numeric definite integrals and numeric limits clearly labeled as numeric fallback.
- Reuse existing algebra cores where they already provide bounded recognition or validation.

## Post-`CALC-CORE1` Milestone Contract

After `CALC-CORE1`, each calculus milestone should answer four questions before implementation:

1. What calculus surface is being improved?
2. Which shipped cores does it depend on?
3. What exact behavior is allowed, and where does it stop?
4. If a prerequisite is not ready, is the right next task still calculus, or should work pause for an algebra/core milestone?

This keeps the current roadmap coherent. Differentiation, integration, limits, series, partials, and ODE work remain under the `CALC-*` lane, but each milestone must respect its dependencies. For example, integration strategy work may depend on derivative backchecks and algebraic equivalence; if those checks are not trustworthy enough, the integration milestone should stop and create the prerequisite rather than adding a one-off integration workaround.

## Milestone Sequence

### `CALC-AUDIT0` - Status And Reuse Audit

Purpose:
- verify the current calculus surfaces before adding breadth
- map which shipped algebra cores are safe to reuse
- identify duplicated derivative, integral, limit, and Advanced Calc logic

Scope:
- review `Calculate` calculus workbench behavior
- review `Advanced Calc` tools
- review symbolic differentiation, integration, limits, series, partials, ODE, and numeric IVP coverage
- build a status table of shipped, flaky, missing, and duplicated behavior
- identify candidate shared helpers rather than making behavior changes immediately

Deliverables:
- a tracked audit note under `.memory/research/`
- focused regression checklist for calculus routes
- recommended order for the next calculus capability milestone

Out of scope:
- no new math behavior
- no UI redesign
- no new external references
- no Playground work

Exit criteria:
- we know what calculus already does
- we know where algebra reuse is safe
- we know the first capability slice after the audit

Recommended verification:
- focused calculus unit tests
- focused Advanced Calc unit tests
- memory protocol check
- optional UI smoke on the calculus and Advanced Calc menus

### `CALC-CORE1` - Shared Calculus Evaluation Boundary

Purpose:
- reduce drift between basic calculus workbench behavior and Advanced Calc behavior
- make result origin, warnings, exact output, approximate output, and stop reasons more consistent

Scope:
- extract or align small shared helpers only where duplication is real
- keep derivative, integral, and limit outputs on existing result surfaces
- preserve current visible behavior except for clearer provenance or wording
- align validation/guard behavior around existing runtime-envelope and result-guard patterns

Out of scope:
- no new antiderivative families
- no new limit algorithms
- no new solver budget setting
- no large architecture framework

Exit criteria:
- calculus result handling is easier to extend safely
- future calculus milestones can add capability without duplicating result plumbing

Recommended verification:
- focused calculus and Advanced Calc regression tests
- lint on touched modules
- memory protocol check

### `CALC-CORE2` - Dependency Readiness And Strategy-Aware Core

Purpose:
- make post-`CALC-CORE1` calculus work dependency-gated before new capability ships
- add internal derivative backchecks for candidate antiderivatives
- label existing symbolic integration wins by internal strategy without changing visible result origins

Scope:
- exact antiderivative backcheck first, numeric-confidence spot checks second
- internal strategy metadata for direct rules, inverse-trig, derivative-ratio, u-substitution, by-parts, affine-linear, and Compute Engine wins
- dependency matrix for future calculus milestones and algebra/core prerequisites
- no UI badge, public API, or visible result-origin changes

Out of scope:
- no new antiderivative families
- no broad integration strategy selector
- no LIATE/by-parts expansion
- no rationalization, partial fractions, or radical substitution implementation

Exit criteria:
- future calculus milestones know their required substrates before implementation
- `CALC-COMP1` is either allowed narrowly or paused for an explicit prerequisite

Recommended verification:
- focused calculus/symbolic unit tests
- browser smoke for existing calculus surfaces
- lint on touched calculus modules
- memory protocol check

### `CALC-COMP1` - Bounded Substitution Antiderivatives

Purpose:
- turn the existing substitution-style antiderivative support into a deliberate calculus-composition milestone
- broaden only through already-safe carriers and derivative-ratio checks
- act as the first capability milestone after `CALC-CORE2`; if derivative backchecks or algebra carriers are not ready, pause and plan the prerequisite before shipping new antiderivative behavior

Scope:
- start from the `CALC-CORE2` dependency matrix
- support bounded `f(u)u'` patterns where `u` belongs to already-recognized carrier families
- prioritize affine, powers, exponentials, logarithms, simple radicals, and selected absolute-value-safe forms
- reuse existing derivative logic to verify candidate antiderivatives when practical
- improve unsupported messaging when a pattern is recognized but outside the bounded set

Candidate examples:
- `integral cos(3x+2) dx`
- `integral 2x e^(x^2) dx`
- `integral (2x+1)/(x^2+x+3) dx`
- selected `u^n u'`, `1/u * u'`, and `e^u u'` forms

Out of scope:
- no general Risch integration
- no open-ended trig identity search
- no arbitrary nested substitution chains
- no branch-heavy piecewise integration
- no local calculus-only clone of an algebra helper that should live in a shared algebra core

Exit criteria:
- common composition antiderivatives feel intentional and validated
- failures explain the bounded stop rather than sounding like parser failure
- any blocked dependency is recorded as an algebra/core prerequisite instead of being hidden as a calculus hack

Recommended verification:
- integration unit tests
- Advanced Calc indefinite-integral tests
- derivative-backcheck tests for accepted antiderivatives

### `CALC-DIFF1` - Powered Derivatives And Strategy Badges

Status: completed on 2026-04-25.

Purpose:
- make derivative readiness explicit before moving to limits
- strengthen app-owned powered-function differentiation and chain-rule handling
- add visible derivative strategy badges without exposing proof/check status

Scope shipped:
- powered-function notation such as `sin^2(x)` and nested forms such as `sin^2(cos^3(x))`
- variable-exponent function powers such as `cos^{2x}(x)` and `cos^{2x}(sin^x(5))`
- known inverse trig derivative families, including parser-recognized `sin^{-1}(x)`
- parser-recognized inverse hyperbolic derivative families
- shared derivative strategy metadata for Calculate free-form derivatives and guided `Calculus > Derivative`

Still out of scope:
- generic arbitrary inverse-function theorem support for `f^{-1}`
- broad trig identity simplification
- broad derivative proof or step-by-step derivation display
- general piecewise derivative logic

### `CALC-COMP2` - Chain-Rule Derivative Structure

Status: mostly absorbed by `CALC-DIFF1`; not the next active milestone.

Purpose:
- make derivatives over composed expressions more readable and trustworthy
- convert algebra composition work into clearer derivative output and explanation

Scope:
- preserve exact derivative correctness
- improve readback for chain-rule cases
- surface concise provenance for chain-rule/product-rule/quotient-rule style wins where useful
- use existing simplification and formatter helpers rather than adding a new rewrite engine

Candidate examples:
- `d/dx sin(x^2+1)`
- `d/dx ln(sqrt(x^2+1))`
- `d/dx abs(x^2-1)` with honest domain/branch wording

Out of scope:
- no broad simplifier rewrite pass
- no piecewise derivative engine
- no generalized proof view

Exit criteria:
- composed derivatives read like deliberate calculus results
- abs/radical/log domain-sensitive cases stop or warn honestly
- only reopen this slot if a specific derivative readback/domain gap blocks a later calculus milestone

Recommended verification:
- symbolic differentiation unit tests
- formatter/readback tests
- targeted UI tests for visible result text if result wording changes

### `CALC-LIM1` - Composition-Aware Limits And Domains

Purpose:
- use existing algebra and composition knowledge to improve finite and infinite limits
- keep numeric fallback honest and visibly labeled

Scope:
- strengthen supported symbolic finite-limit rules over bounded composed ratios
- improve one-sided stop reasons around radicals, logarithms, and absolute values
- reuse existing domain and result-guard helpers where possible
- keep L'Hopital-style handling capped and explicit

Candidate examples:
- removable ratios after bounded factor/cancel reasoning
- `ln(1+x)/x` style capped known forms
- radical and absolute-value one-sided behavior where the branch/domain is obvious

Out of scope:
- no general asymptotic expansion engine
- no multivariable limits
- no silent numeric answer when symbolic and numeric behavior disagree

Exit criteria:
- common bounded composition limits either solve exactly or fail with actionable explanation
- numeric fallback remains clear and trustable

Recommended verification:
- finite-limit and infinite-limit unit tests
- numeric fallback regression tests
- result-guard tests for unstable/unbounded cases

### `CALC-LIM2` - Directional Limits, Asymptotes, And Rational Holes

Status: completed on 2026-04-25.

Purpose:
- make finite-limit input surfaces understand typed directional targets such as `0^+` and `0^-`
- return signed infinities when a one-sided finite-limit divergence is trustworthy
- expand removable rational-hole coverage only through existing rational/factor/cancel substrates

Scope shipped:
- shared finite-limit target parser for numeric and directional finite targets
- free-form Calculate, guided Basic Calculus, and Advanced Calc finite-target normalization
- guided target-field behavior that stores the numeric target and selects the matching direction when a typed directional target is complete
- rule-based signed asymptote behavior for cases such as `1/x`, `1/x^2`, and right-hand `ln(x)` at `0`
- two-sided mismatch preservation for sign-disagreeing cases such as `1/x` at `0`
- expanded removable holes including `(x^3-1)/(x-1)` and `x^2/x`

Still out of scope:
- general asymptotic expansion
- series-based limit solving
- multivariable limits
- visible limit strategy badges
- new `ResultOrigin` values
- calculus-local rational simplification beyond the existing rational/factor/cancel substrate

### `CALC-LIM3` - Local Limit Behavior, Equivalent Forms, And UX Consistency

Status: completed on 2026-04-25.

Purpose:
- push limits one step further after `CALC-LIM2` without starting a general asymptotic or series engine
- organize the leap into three internal slices while shipping it as one milestone
- make successful symbolic limit wins explain themselves through accurate detail notes

Scope shipped:
- `LIM3A`: stronger finite rational/local-order limits and bounded rational dominance at infinity
- `LIM3B`: bounded elementary-equivalent products and quotients for standard `u -> 0` forms
- `LIM3C`: `Limit Method` detail notes threaded through Calculate and Advanced Calc
- signed infinity for trusted rational/local-order and rational-dominance cases
- preservation of mismatch/domain/oscillatory stops for unsafe cases

Still out of scope:
- general series expansion
- broad asymptotic expansion
- multivariable limits
- visible limit strategy badges
- new `ResultOrigin` values
- speculative search or Playground dependency

### `domain-range-CORE1` - Shared Real Domain And Range Core

Purpose:
- create a shared bounded real-domain/range substrate before definite-integral trust work
- consolidate scattered equation, calculus, and range-guard logic without expanding `branch-core`
- give `CALC-INT1` endpoint and interval-safety readiness APIs

Scope:
- collect domain constraints for denominators, logarithms, principal roots, negative powers, and inverse-trig inputs
- prove simple real ranges for constants, sin/cos carriers, trig squares, positive exponentials, principal roots, absolute values, bounded sums, and bounded products
- check point, one-sided-neighborhood, and bounded-interval real-domain safety
- rewire existing equation domain/range guards and calculus finite-limit domain checks to use the shared substrate
- add limited visible honesty wins for impossible nonnegative-range equations such as `sqrt(x)=-1` and `abs(x)=-2`

Out of scope:
- no general inequality solver
- no full interval-proof system
- no broad domain display feature
- no piecewise engine
- no symbolic definite-integral trust changes

Exit criteria:
- equation and calculus consumers share the same bounded domain/range facts
- `CALC-INT1` can query endpoint and interval safety without inventing a new calculus-local domain layer

Recommended verification:
- domain-range core unit tests
- equation domain/range guard regression tests
- calculus finite-limit domain regression tests
- memory protocol check

### `CALC-INT1` - Definite Integral Trust Pass

Purpose:
- make definite and improper integral behavior more trustworthy after symbolic antiderivative coverage improves

Scope:
- use accepted bounded antiderivatives for exact definite integrals when endpoint evaluation is safe
- preserve adaptive Simpson numeric fallback for supported numeric cases
- improve warnings for improper, discontinuous, or unstable intervals
- keep exact-vs-numeric result origin obvious

Out of scope:
- no symbolic integration over arbitrary discontinuities
- no contour or complex integration
- no broad interval proof system

Exit criteria:
- exact definite integrals are used only when endpoint/domain conditions are safe
- numeric definite integrals remain useful but clearly labeled

Recommended verification:
- definite-integral and improper-integral unit tests
- endpoint/domain regression cases
- optional UI smoke for result-origin wording

### `CALC-POLISH1` - Calculus Readback, Guide, And UX Polish

Purpose:
- turn the new calculus capability into a clean user-facing v1 experience

Scope:
- align basic `Calculus` and `Advanced Calc` wording
- update Guide examples only for shipped behavior
- ensure history/replay preserves the right calculus context
- ensure visible stop reasons match the bounded roadmap

Out of scope:
- no new math surface
- no launcher redesign
- no Playground visibility

Exit criteria:
- calculus feels coherent across the app
- shipped examples do not overpromise
- failure states teach the next action without pretending to be a full CAS

Recommended verification:
- focused UI tests
- guide/content tests
- history/replay tests if replay context changes
- memory protocol check

## Later Candidates

These are intentionally not first in the lane:
- `CALC-SER1`: stronger series behavior after derivative and composition output is stable
- `CALC-PARTIAL1`: partial derivative polish after single-variable calculus settles
- `CALC-ODE1`: ODE UX and numeric IVP hardening after the main calculus lane is stable
- `CALC-PLAY1`: speculative integration/search experiments in Playground only, if bounded stable rules stop paying off

## Preferred Near-Term Order

1. `CALC-AUDIT0`
2. `CALC-CORE1`
3. `CALC-CORE2`
4. `CALC-COMP1`, narrowly and only where the dependency matrix is ready
5. `CALC-DIFF1`
6. `CALC-LIM1`
7. `CALC-LIM2`
8. `CALC-LIM3`
9. `domain-range-CORE1`
10. `CALC-INT1`
11. `CALC-POLISH1`

`CALC-COMP2` remains a parked derivative-polish label only. It should not interrupt the active calculus lane unless a specific derivative readback/domain issue blocks the next selected milestone.

The order can change after `CALC-CORE2`, but the principle should not: audit first, consolidate only where needed, then ship bounded calculus capability only through trustworthy existing exact algebra foundations. When a calculus milestone reveals that an algebra or derivative substrate is not ready, pause calculus and address that prerequisite explicitly.
