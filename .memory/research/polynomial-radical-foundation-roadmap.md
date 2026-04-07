# Polynomial and Radical Foundation Roadmap

Date: 2026-04-07

Status: analysis and recommendation only. This is not yet a committed roadmap lock.

## Why this note exists

After shipping `COMP10`, the next tempting step would be `COMP11` or another composition milestone. Current code review suggests that would be premature. The composition layer is now reusing and extending polynomial/radical behavior faster than the shared algebra foundation underneath it. That is a sign that the next clean architectural move is to strengthen polynomial and radical support first.

## Current repo shape

### Polynomial surface today

#### 1. Polynomial screen support is still mixed symbolic + numeric fallback

- `src/lib/modes/equation.ts`
  - Polynomial UI flows (`quadratic`, `cubic`, `quartic`) still call `runExpressionAction(..., 'solve')` first.
  - If symbolic solve does not return exact output, the screen falls back to `solvePolynomialRoots()`.
- `src/lib/polynomial-roots.ts`
  - Degree `2` uses explicit quadratic roots.
  - Degrees `3` and `4` use Durand-Kerner numerically.
  - This is numeric fallback infrastructure, not a broad app-owned symbolic polynomial solver.

#### 2. Factoring is bounded and intentionally conservative

- `src/lib/symbolic-engine/factoring.ts`
  - Supports:
    - symbolic/common-factor extraction
    - grouped symbolic factoring
    - difference of squares
    - integer quadratic factoring by divisor search
  - Does not support:
    - broader cubic/quartic factorization
    - rational-root theorem factoring
    - general polynomial decomposition
    - affine-variable normalization

#### 3. Polynomial parsing utilities exist, but they are narrow and fragmented

- `src/lib/symbolic-engine/patterns.ts`
  - `polynomialTerms()` can extract one-variable polynomial terms with numeric coefficients and integer exponents.
  - This is useful, but still narrow:
    - single bare variable only
    - no shared exact-rational coefficient model across the solver
    - no reusable normalized polynomial object that the app treats as a first-class algebra representation

#### 4. Composition already carries stronger polynomial infrastructure than the shared algebra layer

- `src/lib/equation/composition-stage.ts`
  - Contains exact-scalar arithmetic helpers.
  - Contains bounded polynomial-term parsing for carrier matching.
  - Contains dedicated quadratic carrier solving and shifted-power solving.
  - Supports parameterized periodic and sawtooth follow-on solving through these polynomialized carriers.

This means the composition engine currently contains polynomial logic that is broader and more solver-oriented than the app-wide shared algebra surface. That is the architectural reason to pause new composition breadth and strengthen the shared base first.

### Radical surface today

#### 1. Radical normalization is good, but still bounded

- `src/lib/symbolic-engine/radical.ts`
  - Supports:
    - exact monomial root extraction
    - selected odd-root extraction
    - denominator rationalization
    - bounded conjugate transforms for supported square-root binomials
    - explicit real-domain condition tracking
  - Tests in `src/lib/symbolic-engine/radical.test.ts` confirm:
    - `\sqrt{x^2}` -> `|x|` in simplify mode
    - odd-root extraction for monomial-style radicands
    - bounded rationalization for `1/(1+\sqrt{2})`, `1/(\sqrt{x}+1)`, `1/(\sqrt{x+1}+1)`
    - multivariable radicals still intentionally reject

#### 2. Power/root/log normalization is already a strong companion layer

- `src/lib/symbolic-engine/power-log.ts`
  - Supports:
    - rewrite root <-> rational power
    - same-base log combine
    - change-base transform
    - condition propagation
    - Equation preprocess for solver-friendly carriers

#### 3. Guarded algebra solving for radicals is bounded but real

- `src/lib/equation/guarded/algebra-stage.ts`
  - Supports:
    - isolated square-root equations
    - nth-root equations with affine radicands
    - bounded rational-power isolation
    - bounded conjugate transforms
    - candidate validation and domain-constraint preservation
  - Tests in `src/lib/equation/shared-solve.test.ts` show:
    - `\sqrt{x}=3`
    - `\sqrt{x+1}=x-1` with extraneous-root rejection
    - `1/\sqrt{x}=2`
    - `\sqrt[3]{2x-1}=3`
    - bounded rational-power isolation
    - conjugate-backed solving for `1/(\sqrt{x}+1)=1/2`

#### 4. Radical solving is still narrower than the app’s newer composition expectations

Composition milestones now already rely on:
- rational powers
- root carriers
- quadratic carriers
- shifted powers
- mixed sawtooth and periodic handoff through those carriers

That means broader radical/polynomial algebra is now the limiting substrate for future solver growth.

## Recommendation

Before starting more composition work, prioritize a polynomial/radical foundation pass.

This is not because composition is “done”; it is because further composition breadth will increasingly duplicate or tunnel around missing algebra capabilities if the base remains narrower than the composition layer.

## Proposed order

### 1. POLY1 — Shared Exact Polynomial Core

Primary goal:
- extract the exact-scalar polynomial logic now living mostly in `src/lib/equation/composition-stage.ts`
- convert it into a reusable shared algebra surface

What this should provide:
- exact rational coefficient arithmetic
- normalized one-variable polynomial representation
- degree-bounded parsing at least through degree `4`
- rebuild back to AST / LaTeX
- reusable discriminant/factor helpers where applicable
- enough structure to serve:
  - factoring
  - guarded algebra
  - polynomial screen
  - radical follow-on solving
  - future composition

Why it matters:
- this removes the current imbalance where composition owns stronger polynomial logic than the algebra foundation

### 2. POLY2 — Bounded Exact Cubic and Quartic Solve/Factor Surface

Primary goal:
- improve exact polynomial solving without jumping into unrestricted CAS-grade general polynomial solving

Good target families:
- rational-root-theorem factorization
- factorable cubic families
- quartics that split into quadratics
- biquadratic forms
- exact factor-first symbolic roots when they stay bounded and clean

What this should not attempt yet:
- unrestricted Cardano/Ferrari everywhere
- arbitrary polynomial symbolic solving beyond quartic
- multivariable polynomial algebra

Why it matters:
- the polynomial screen still falls back numerically for many cubic/quartic families that should be exact when factorable

### 3. RAD1 — Broader Radical Normalization and Two-Radical Bounded Transforms

Primary goal:
- widen the normalization layer without turning it into unrestricted denesting

Good targets:
- broader supported radicands than current monomial/affine-only style families
- selected quadratic radicands when they stay bounded and single-variable
- bounded two-radical rationalization patterns
- cleaner nested root normalization when it collapses exactly

What this should not attempt yet:
- unrestricted nested denesting
- broad multivariable radicals
- arbitrarily long conjugate/rationalization chains

Why it matters:
- better normalization would strengthen both display and solving without changing the higher-level solver contract

### 4. RAD2 — Sequential Radical Isolation with Candidate Validation

Primary goal:
- extend guarded radical solving from one clean isolation step to bounded multi-step radical equations

Good targets:
- two-step radical equations
- sequential squaring with preserved domain/candidate validation
- bounded mixed root/rational-power families

What this should not attempt yet:
- open-ended repeated squaring
- theorem-prover-like branch search
- unrestricted nested radical equation solving

Why it matters:
- current guarded algebra already has the right infrastructure:
  - domain constraints
  - candidate validation
  - structured unresolved output
- so this is a natural bounded widening of the existing layer

### 5. POLY-RAD1 — Polynomialized Radical Follow-On Solving

Primary goal:
- close the bridge between radical isolation and polynomial solving

Good targets:
- radical equations that reduce to quadratic or shifted-power follow-on families
- bounded cases where a radical transform produces a polynomialized exact solve-ready family

Why it matters:
- this is the point where the stronger polynomial foundation and the stronger radical foundation start paying off together
- it also prepares future composition work to reuse shared algebra infrastructure instead of special-casing new carriers in composition-stage

## Strongest evidence from current code

The recommendation above is based on these repo observations:

- `src/lib/polynomial-roots.ts` is still numeric-first for degree `3` and `4`
- `src/lib/symbolic-engine/factoring.ts` is still bounded to common factor, difference of squares, and integer quadratic factoring
- `src/lib/symbolic-engine/patterns.ts` has useful polynomial-term extraction, but not a broad reusable polynomial core
- `src/lib/symbolic-engine/radical.ts` and `src/lib/symbolic-engine/power-log.ts` are good bounded normalizers, but still conservative in scope
- `src/lib/equation/guarded/algebra-stage.ts` already supports bounded radical and rational-power equation solving, which means it is a strong place to deepen radical support next
- `src/lib/equation/composition-stage.ts` now contains stronger polynomialized carrier logic than the shared algebra foundation, which is the clearest sign that composition has advanced faster than the base algebra layer

## Practical conclusion

If the goal is durable solver growth, the next best move is:

1. strengthen shared polynomial infrastructure
2. strengthen bounded radical normalization/solving
3. then return to composition with a stronger algebra substrate

That is a cleaner path than continuing directly into `COMP11`, because it reduces duplication, makes the solver easier to maintain, and gives future composition milestones more shared machinery to stand on.
