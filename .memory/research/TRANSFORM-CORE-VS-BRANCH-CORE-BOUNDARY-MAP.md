# Transform-Core vs Branch-Core Boundary Map for Calcwiz

Status: guidance note

Purpose: capture the repo-grounded distinction between transform handling and branch/case handling so future architecture work does not collapse them into one oversized subsystem or overreact into multiple microkernels.

This note refines the broader kernel-first direction already captured in memory.

---

## Core conclusion

Calcwiz should treat **transform handling** and **piecewise/case handling** as **two separate algebra-core concerns**.

The preferred shape is:
- one runtime kernel
- many reusable algebra cores
- `transform-core` for deterministic transforms
- `branch-core` for bounded branch generation and branch metadata
- orchestrators that compose them under kernel budgets and policy

This means:
- do **not** create a combined transform/piecewise runtime
- do **not** create per-family microkernels
- do **not** treat all branching as general piecewise algebra

---

## Why they should stay separate

Although transforms and branch families often appear in the same solve attempt, they solve different architectural problems.

### Transform handling is about:
- recognition
- legality
- exact rewrite/application
- preserved constraints
- sink prediction
- provenance inputs

### Branch handling is about:
- generating finite bounded branches
- carrying branch-local constraints
- exposing branch metadata
- branch-aware numeric guidance
- preserving candidate-validation inputs

Combining these into one subsystem would blur two different responsibilities:
- “can we rewrite this?”
- “what cases/branches does this split into?”

Keeping them separate gives cleaner reuse and smaller contracts.

---

## Transform-Core

Preferred role:
- shared deterministic algebra-transform substrate

Should own:
- transform-family recognition
- transform eligibility detection
- exact transform descriptors
- exact transformed output
- preserved-condition / exclusion inputs
- bounded sink-prediction hints
- transform provenance inputs

Examples that fit:
- rewrite as root
- rewrite as power
- change base
- combine fractions
- cancel factors
- use LCD
- rationalize
- conjugate

Should not own:
- runtime hosts
- execution budgets
- final stage ordering
- candidate validation
- numeric interval solving
- final result-card wording or envelope policy

Repo-grounded current anchor:
- `src/lib/algebra-transform.ts`
- supporting normalizers in `symbolic-engine`

Main reason to extract:
- several lanes are already reusing bounded transform logic, and transform eligibility + exact application are lower-risk to centralize than general branch engines.

---

## Branch-Core

Preferred role:
- shared bounded branch-generation and branch-metadata substrate

Use the name `branch-core` by default.
Avoid `piecewise-core` unless the repo later commits to broader piecewise algebra.

Why:
- current pressure is bounded branch generation, not full piecewise simplification
- `piecewise-core` implies inequalities, region algebra, and broader case engines too early

Should own:
- branch-family recognition
- bounded branch equation generation
- branch constraints
- branch metadata
- branch-local guidance inputs
- helper logic for deduping and classifying branch families

Families that fit:
- absolute-value branching
- principal-range branches
- periodic branch families
- future bounded sign-sensitive families when they share the same branch bookkeeping patterns

Should not own:
- full piecewise simplification
- inequalities
- nested general case explosion
- runtime policy
- UI rendering policy

Repo-grounded current anchors:
- `src/lib/abs-core.ts`
- periodic/piecewise family metadata in `src/types/calculator/display-types.ts`
- branch-heavy guarded solve flows in `src/lib/equation/guarded/algebra-stage.ts`

Main reason to extract:
- only when branch bookkeeping starts duplicating across abs, periodic/principal-range, and later bounded case families.

---

## Relationship to the runtime kernel

Neither `transform-core` nor `branch-core` should become runtime authority.

Keep runtime authority in:
- `src/lib/kernel/capabilities.ts`
- `src/lib/kernel/runtime-hosts.ts`
- `src/lib/kernel/runtime-profile.ts`
- `src/lib/kernel/runtime-policy.ts`
- `src/lib/kernel/runtime-envelope.ts`

Rule:
- if the problem is execution authority, budgets, stop policy, or host ownership, it belongs to the runtime kernel
- if the problem is reusable bounded math logic, it belongs in an algebra core

---

## Relationship to orchestrators

Orchestrators should compose these cores, not absorb their low-level logic.

Examples:
- guarded Equation solve
- composition stage
- substitution stage
- algebra-stage bounded handoffs

Orchestrators may own:
- stage order
- recursion flow
- bounded handoff order
- sink choice
- candidate-validation coordination

Orchestrators should not become:
- transform helper bags
- branch bookkeeping dumps
- pseudo-kernels with duplicated policy logic

---

## Default extraction order

Default preference:
- extract `transform-core` first

Reason:
- lower-risk boundary
- more deterministic
- easier to test independently
- less likely to accidentally create a general case engine

Override this only when the active roadmap becomes clearly branch-heavy.

Examples of branch-heavy pressure that could justify `branch-core` first:
- another abs milestone that broadens wrappers/carriers substantially
- broader principal-range / periodic branch reuse across composition work
- a new bounded branch family that duplicates abs-style branch bookkeeping

---

## Naming rule

Preferred names:
- `transform-core`
- `branch-core`

Use `case-core` only if the repo later needs a more general canonical case representation.

Avoid:
- `piecewise-runtime`
- `transform-runtime`
- `piecewise-kernel`
- `branch-kernel`

These names imply runtime authority the repo does not need yet.

---

## Practical guardrail

Use this rule:

**Transforms and branches can interact in one solve path, but they should still be implemented as different bounded cores.**

And this one:

**Use `branch-core`, not `piecewise-core`, until broader piecewise algebra is actually a product commitment.**

---

## Final recommendation

For Calcwiz as it exists now:
- keep one runtime kernel
- keep adding reusable algebra cores
- keep `transform-core` and `branch-core` separate
- prefer `transform-core` first by default
- only let branch-heavy roadmap pressure reverse that order

That keeps the architecture flexible without multiplying runtimes or committing to a larger piecewise system too early.
