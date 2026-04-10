# Kernel-First Boundary Map for Calcwiz

Status: guidance note

Purpose: capture the current repo-grounded architecture direction for Calcwiz as algebra breadth grows, especially around piecewise/case handling, transform handling, and the question of whether the repo should move toward multiple microkernels.

This note is intended to protect the codebase from two opposite mistakes:
- keeping too much family-specific logic tangled together with runtime policy and orchestration
- overreacting by creating many per-family engines or microkernels too early

---

## Core conclusion

Calcwiz should stay **kernel-first, not microkernel-heavy**.

The preferred shape is:
- **one runtime kernel**
- **many reusable algebra cores**
- **thin orchestrators**
- **thin adapters**
- **UI as presentation only**

Put differently:
- the **kernel** should own execution authority
- **algebra cores** should own reusable bounded math-family logic
- **orchestrators** should compose those cores into staged solving flows
- **adapters** should translate between app surfaces and runtime/orchestrator contracts
- the **UI** should render and collect input, not decide math truth

This is the recommended interpretation of the recent architecture discussion:
- do not create a separate microkernel for every family such as piecewise, transforms, radicals, or abs
- do continue extracting shared algebra cores when a family or pattern is reused across multiple lanes
- if architecture resumes because of real reuse pressure, the next likely extractions are shared `branch-core` / `case-core` and `transform-core`, not per-engine microkernels

---

## Why not multiple microkernels now

The repo already has a clear single-runtime direction:
- shared runtime hosts
- shared capability registry
- shared runtime profiles / budgets
- shared envelope / advisory / stop-policy direction
- one guarded Equation runtime that stages many bounded solve paths together

Creating many microkernels now would likely introduce more complexity than value.

### Main risks

#### 1. Cross-family math becomes awkward

Real symbolic flows are rarely pure.
A single solve attempt may move through radical normalization, branch generation, polynomial-carrier follow-on, candidate validation, and display shaping.

If each family becomes its own runtime authority, the cost of composing them rises sharply.

#### 2. Runtime concerns get duplicated

Budgets, host ownership, stop reasons, advisories, envelopes, and future job/progressive execution contracts should be shared runtime concerns.
They should not be redefined separately for every algebra family.

#### 3. The repo drifts into premature infrastructure

A true microkernel/plugin system makes sense when there are real pressures like:
- independent module lifecycles
- optional installation/loading boundaries
- strict runtime isolation
- remote execution adapters
- external embedders needing plugin-like surfaces

That is not the current pressure.
The current pressure is reusable algebra logic inside one bounded CAS runtime.

---

## Recommended architecture layers

## 1. Kernel

Location shape:
- `src/lib/kernel/*`

Role:
- the single runtime authority

Owns:
- capability registry
- runtime hosts
- execution profiles / budgets
- stop policy taxonomy
- envelopes / advisories
- shared runtime contracts
- future job/progressive execution contracts

Examples already aligned with this role:
- `capabilities.ts`
- `runtime-hosts.ts`
- `runtime-profile.ts`
- `runtime-policy.ts`
- `runtime-envelope.ts`

Kernel rule:
- the kernel governs execution
- the kernel does **not** own family-specific symbolic math logic

Kernel must not become:
- a radical engine
- an abs engine
- a transform engine
- a piecewise engine

---

## 2. Algebra cores

Location shape:
- `src/lib/*-core.ts`
- or a future grouped area such as `src/lib/algebra/*`

Role:
- reusable bounded math-family logic

Current examples:
- `polynomial-core`
- `radical-core`
- `abs-core`

Strong future candidates:
- `branch-core` or `case-core`
- `transform-core`
- later, if needed, a narrow `carrier-core`

Algebra cores may own:
- recognition
- normalization
- canonical internal representation
- bounded transforms
- exact helper arithmetic
- branch/case metadata
- condition and exclusion extraction
- family-local helper types

Algebra cores must not own:
- runtime hosts
- execution budgets
- app-mode routing
- UI wording
- display envelope policy
- history or persistence rules

Core rule:
- a core is reusable math logic, not runtime authority

---

## 3. Orchestrators

Location shape:
- `src/lib/equation/*`
- `src/lib/equation/guarded/*`
- later, possibly a planner/progressive layer

Role:
- stage ordering and bounded composition of cores

Examples already aligned with this role:
- guarded Equation solve flow
- composition stage
- substitution stage
- algebra-stage handoff logic
- merge and candidate-validation coordination

Orchestrators may own:
- stage order
- recursion flow
- sink selection
- bounded handoffs
- candidate validation orchestration
- staged fallback strategy
- “try A then B then C” logic

Orchestrators may depend on:
- kernel budgets/policies
- algebra cores
- validation helpers

Orchestrators must not become:
- giant utility bags for low-level algebra helpers
- UI result renderers
- independent runtimes with duplicated kernel concerns

Orchestrator rule:
- orchestrators compose cores under kernel constraints

---

## 4. Adapters

Location shape:
- `src/app/logic/*`
- mode-specific adapters around `Calculate`, `Equation`, `Table`
- later Rust/service/remote bridges

Role:
- translate between app surfaces and internal runtime/orchestrator contracts

Adapters may own:
- request shaping
- controller seams
- mode-level routing into runtime/orchestrators
- conversion to `DisplayOutcome` or equivalent app-safe results
- bridge contracts for Rust/backend/service layers

Adapters must not own:
- symbolic family truth
- branch generation
- transform eligibility logic
- polynomial factor logic

Adapter rule:
- adapters translate and connect; they do not invent math

---

## 5. UI

Location shape:
- `src/components/*`
- app shell and surface components

Role:
- presentation and interaction only

UI may own:
- panels
- trays
- settings surfaces
- result cards
- mode screens
- visual badges and layout

UI must not own:
- solve-family routing
- algebra rules
- runtime policy
- candidate validation
- branch-generation truth

UI rule:
- the UI changes visibility and interaction, not mathematical truth

---

## Dependency direction

Preferred dependency flow:

`UI -> adapters -> orchestrators -> algebra cores`
`                     \-> kernel -----------^`

More explicitly:
- UI may call adapters/controllers
- adapters may call orchestrators and kernel-owned contracts
- orchestrators may call algebra cores and read kernel budgets/policies
- algebra cores should remain leaf-like and reusable
- kernel should stay independent from family-specific algebra logic

Avoid reversing this.

Especially avoid:
- algebra cores importing UI or app shell code
- kernel depending on family-specific symbolic engines
- UI directly orchestrating multi-stage solve policy

---

## What this means for piecewise and transforms

## Piecewise / case handling

Do **not** create a `piecewise-kernel` or `piecewise-runtime` now.

If piecewise/case pressure grows, the preferred extraction is a shared algebra core such as:
- `branch-core` when the main need is branch generation, constraints, and branch metadata
- `case-core` when the main need is canonical case representation, case merging, and case readback

This should serve bounded reuse across surfaces such as:
- absolute value
- sign-like families
- principal-range branching
- future bounded piecewise-derived families

It should remain a reusable algebra core, not a second runtime authority.

## Transform handling

Do **not** create a `transform-kernel` or separate transform runtime now.

If transform reuse pressure grows, the preferred extraction is a shared `transform-core`.

`transform-core` should own things like:
- transform eligibility detection
- transform descriptors
- sink prediction
- bounded transform application
- provenance inputs
- exact supplement inputs

It should **not** become a second solver runtime.

The expected composition is:
- `Calculate` adapters expose transform chips or actions
- `Equation` orchestrators decide whether a transform is legal as a bounded pre-solve step
- the kernel remains responsible for host/budget/policy concerns

---

## Practical folder interpretation for Calcwiz

A clean conceptual shape could be:

```text
src/lib/
  kernel/
    capabilities.ts
    runtime-hosts.ts
    runtime-profile.ts
    runtime-policy.ts
    runtime-envelope.ts
    # later: jobs.ts, progress.ts, planner.ts

  algebra/
    polynomial-core.ts
    radical-core.ts
    abs-core.ts
    # later:
    branch-core.ts
    case-core.ts
    transform-core.ts
    carrier-core.ts

  equation/
    guarded/
      run.ts
      algebra-stage.ts
      substitution-stage.ts
      numeric-stage.ts
      rewrite-trig-stage.ts
    composition-stage.ts
    candidate-validation.ts
    candidate-rejection.ts

  symbolic-engine/
    # symbolic consumers/composers that reuse algebra cores

src/app/
  logic/
    runtimeControllers.ts
    modeActionHandlers.ts
    # later bridge adapters

src/components/
  # presentation only
```

This note does **not** require an immediate file move.
It defines responsibility boundaries first.
If later reorganization happens, it should follow these boundaries rather than forcing a broad cleanup for aesthetics alone.

---

## Extraction rules: when a new core is justified

Extract a new algebra core when most of the following are true:
- the logic is reused by more than one math lane or mode
- the logic has a stable bounded identity
- the logic is not primarily UI or runtime policy
- the logic can be tested independently
- the logic reduces duplication in orchestrators rather than adding another abstraction layer for style only

Good examples:
- `branch-core` if abs/sign/principal-range branching starts duplicating branch bookkeeping
- `transform-core` if multiple lanes share bounded transform eligibility and sink prediction
- `carrier-core` if polynomial-carrier recognition/back-solve becomes a clearly reusable substrate beyond one stage

Do **not** extract a core merely because a file is large.
File size alone is not a sufficient reason to create a new runtime-like subsystem.

---

## When a true microkernel/plugin direction becomes justified

A stronger microkernel or plugin architecture should only be considered later if there is a real boundary pressure such as:
- installable math packs
- optional runtime-loaded modules
- strict external embedding APIs
- isolated remote execution backends
- different host families needing independent lifecycle/versioning
- sandboxed third-party extensions

Until those pressures appear, the best-fit direction remains:
- one runtime kernel
- reusable algebra cores
- bounded orchestrators
- no per-family microkernels

---

## Forbidden drift

Avoid these patterns unless a later real runtime boundary appears:
- `piecewise-runtime`
- `transform-runtime`
- `radical-runtime`
- `abs-runtime`
- one runtime host per algebra family
- duplicated budget/policy/stop-reason logic in math-family subsystems
- UI components deciding staged solve policy
- algebra cores importing UI/app shell code

In plain terms:
- do not multiply runtimes just because math families are different
- different math families do **not** automatically imply different kernels

---

## Final rule of thumb

Use this phrase as the default architectural guardrail for Calcwiz:

**One kernel. Many algebra cores. Thin orchestrators. Thin adapters. Dumb UI.**

And use this phrase to reject premature architecture drift:

**If the problem is reusable math logic, extract a core. If the problem is execution authority, keep it in the kernel.**
