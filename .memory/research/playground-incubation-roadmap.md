# Playground Incubation Roadmap

Date captured: 2026-04-11

Status: architecture and roadmap recommendation only. This is not yet a locked implementation commitment.

Source file:
- `C:\Users\ahmed\Downloads\Calcwiz Playground  Incubation Ladd.txt`

Related architecture note:
- `docs/architecture/playground-incubation-ladder.md`

Important interpretation:
- the source idea is powerful, but it should be implemented as an incubation system, not as a production subsystem
- governance and boundary rules should land before any large experiment scaffold
- successful experiments must graduate by extraction into stable layers, not by direct reuse from incubation code

## Why this roadmap exists

Calcwiz is now large enough that promising ideas can fail in two opposite ways:
- they never get tested because the stable app is rightly conservative
- they leak into product architecture before they are bounded enough to trust

This roadmap exists to provide a third path:
- deliberate experimentation
- explicit maturity levels
- clean graduation into stable architecture when value is proven

The roadmap is not about building a “Playground product.”
It is about creating the smallest useful incubation system that protects the main app while still letting the project grow.

## Roadmap thesis

Calcwiz should gain a formal incubation ladder so the project can explore frontier capabilities without contaminating the stable runtime.

The roadmap should optimize for four things at once:
- freedom to experiment
- clear architectural authority
- disciplined promotion between levels
- clean adoption when an experiment actually proves itself

## Locked guardrails

These are the non-negotiable constraints for the roadmap:
- Playground is not a production core.
- Stable product code must never import from incubation code.
- Adoption happens by extraction or rewrite into stable layers.
- The first rollout phase is governance and repo-boundary work, not a giant experimental subsystem.
- Incubation is level-based and promotion-driven, not a flat sandbox.
- The first pilot should prove the incubation model itself, not hide the model under remote-compute complexity.

## Recommended sequence

The recommended sequence is intentionally incremental.

### `PGL0` — Architecture Capture

Purpose:
- lock the conceptual model before implementation begins

Scope:
- define what Playground is and is not
- define the one-way dependency law
- define graduation by extraction
- define level meanings
- capture the direction in durable docs and memory

Deliverables:
- architecture note
- roadmap note
- source preservation
- current-state / decisions / journal capture

Out of scope:
- no folder scaffold
- no lint rules
- no runtime or UI behavior changes

Exit criteria:
- the repo has a canonical explanation of the incubation model
- the direction is durable and referencable

Recommended verification:
- `npm run test:memory-protocol`

### `PGL1` — Boundary Scaffold

Purpose:
- create the smallest safe repo boundary for incubation work

Scope:
- add top-level `playground/`
- add README and maturity-level folders
- add initial conventions for where experiments live
- add the first import-boundary guardrails

Deliverables:
- `playground/README.md`
- level folders
- starter structure for records/templates
- initial lint or path restrictions that stop stable imports from `playground/`

Out of scope:
- no experimental engine yet
- no remote compute yet
- no new stable runtime surface

Exit criteria:
- stable code cannot casually import incubation code
- new experiments have a visible home
- the repo boundary is obvious to future contributors

Recommended verification:
- boundary-rule check
- repo-level lint/import validation
- no runtime diff in product behavior

### `PGL2` — Experiment Record System

Purpose:
- make incubation traceable and governable

Scope:
- define how experiments are described and evaluated
- make promotion and retirement explicit

Deliverables:
- experiment manifest template
- promotion checklist
- retirement checklist
- example record for one fake or placeholder experiment

Required metadata:
- owner
- lane
- current level
- hypothesis
- in-scope cases
- out-of-scope cases
- known stop reasons
- promotion criteria
- retirement criteria

Out of scope:
- no new product behavior
- no actual adoption yet

Exit criteria:
- the Playground cannot silently become a junk drawer
- every experiment can be reviewed with the same questions

### `PGL3` — Pilot 1: Symbolic Search Lab

Purpose:
- prove the incubation system with a high-value, low-infrastructure pilot

Why this should be first:
- it reuses current stable algebra cores immediately
- it is close to Calcwiz's existing value proposition
- it avoids remote-trust, auth, and job-handling noise in the first proof

Candidate scope:
- aggressive symbolic-search experiments
- alternate bounded planner ordering
- transform-chain ranking
- search-depth comparison harnesses
- heuristic candidate scoring over already-shipped solver components

Deliverables:
- at least one real experiment record
- example inputs and outcomes
- comparison against current stable solver behavior
- clear statement of what remains too risky for product adoption

Out of scope:
- no stable app integration
- no new shipped solver path
- no direct adoption

Exit criteria:
- at least one symbolic-search idea reaches Level 1 or Level 2
- the experiment produces real evidence, not just intuition

### `PGL4` — External Compute Foundations Lab

Purpose:
- lay the foundations for stronger but riskier compute workflows inside the same incubation rules

Why it should come after `PGL3`:
- it is one of the strongest Playground candidates
- but it brings extra concerns that can hide whether the incubation model itself is sound:
  - trust
  - cost
  - latency
  - fallback behavior
  - job handling
  - determinism

Interpretation:
- `PGL4` is foundations-only
- it does not yet include real provider execution
- it prepares the repo for a later SSH-backed pilot instead of pretending that provider integration is already ready

Candidate scope:
- provider-neutral runner/job/artifact contracts
- repo-local ignored profile shape for future SSH-backed runners
- local harness proof over one real existing Playground workload
- trust/fallback and provenance rules for future remote execution

Deliverables:
- external-compute record and manifest
- local harness and workload registry proof
- checked-in JSON templates for runner profiles and job specs
- trust-boundary notes and future-provider shape

Out of scope:
- no production remote-compute subsystem
- no stable kernel dependency on remote execution
- no real SSH/provider execution in this milestone

Exit criteria:
- external compute is understood as an incubation lane rather than an architectural shortcut
- the repo has a provider-neutral contract and a real local harness proof
- the next sequencing decision is whether to take a first real SSH/provider pilot, not whether the foundations still need to be invented

### `PGL5` — User-Owned SSH Remote Pilot

Purpose:
- take the `PGL4` SSH contract into one real bounded remote run without introducing provider complexity

Interpretation:
- `PGL5` stays singular and VM-first
- the first real remote target is a user-owned SSH-accessible machine
- provider/rented-host execution stays deferred until after this pilot proves useful

Scope:
- execute one real Playground workload over `ssh`
- upload JSON runner/job inputs to the remote target
- run a dedicated remote Playground entrypoint from the remote repo
- pull the resulting manifest and summary back locally
- compare the pulled-back summary against a fresh local parity baseline

Deliverables:
- one active SSH pilot record and manifest
- remote-execution support in the external-compute runner for `ssh`
- one parity report shape for remote versus local comparison
- one explicit operator profile path that stays local-only and ignored

Out of scope:
- no provider APIs
- no queueing, retry orchestration, or cancellation controls
- no direct app dependency on incubation code
- no broad rollout of multiple remote pilots at once

Exit criteria:
- one real SSH target completes an end-to-end run
- remote artifacts are pulled back into the local repo under `.task_tmp/`
- the local parity report can classify the run as `match`, `mismatch`, `remote-failed`, or `pullback-failed`
- the next sequencing decision becomes provider/rented-host follow-up versus another bounded refinement pass

### `PGL5+` — SSH VM Hardening Gate

Purpose:
- harden the already-proven VM-first SSH lane enough to support a real adoption-or-retire discussion

Interpretation:
- `PGL5+` is not provider-host expansion
- `PGL5+` is not `PGL6` graduation
- it is the bounded hardening pass between the live `PGL5` proof and any later adoption or provider-host decision

Scope:
- keep exactly one real workload:
  - `sym-search-planner-ordering`
- add preflight checks for local `ssh` / `scp`, batch-mode SSH, and remote repo layout
- add bounded step-level timeouts for preflight, upload, remote run, and pullback
- add one retry on upload and one retry on pullback only
- add explicit failure classes, provenance, and step-result metadata to the local SSH manifest
- replace handwritten `.task_tmp` live-gate scripts with one checked-in operator command

Deliverables:
- one level-3 integration-candidate record and manifest for SSH VM hardening
- one checked-in operator entrypoint:
  - `npm run playground:ssh-vm -- --profile <path> --job <path>`
- explicit failure classes for:
  - `preflight-failed`
  - `upload-failed`
  - `remote-launch-failed`
  - `remote-timeout`
  - `remote-workload-failed`
  - `pullback-failed`
  - `parity-mismatch`
  - `cancelled`
- manifest provenance for local and remote commit / Node / npm state

Out of scope:
- no provider-specific host integration
- no second workload
- no queueing or dashboard layer
- no stable app dependency on incubation code

Exit criteria:
- one successful live `calcwiz-box` run still returns parity `match`
- at least two induced failure paths classify correctly
- the next sequencing decision becomes:
  - provider-host expansion
  - or no-adopt / retire
  rather than basic SSH reliability uncertainty

### `PGL6` — Graduation Workflow

Purpose:
- prove that incubation can produce clean adoption instead of contamination

Scope:
- extract one experiment into the correct stable layer
- add real tests and contracts
- keep incubation records as history rather than as dependencies

Deliverables:
- one extracted stable implementation
- stable tests and verification
- graduation record explaining:
  - what was learned
  - what was extracted
  - what stayed experimental

Out of scope:
- no “the app now calls `playground/`”
- no partial adoption through convenience imports

Exit criteria:
- the first graduation proves that the model works
- stable app code still has no dependency on incubation code

## Recommended pilot order

Recommended order:
1. Symbolic Search Lab
2. External Compute Lab
3. Vector / higher-dimensional workflows
4. Embedding and integration patterns

### Why symbolic search comes first

It is the best first proof because it:
- is close to current Calcwiz math value
- exercises stable-core reuse immediately
- does not require remote trust boundaries
- produces high-signal evidence quickly

### Why external compute is still important

It is arguably the strongest Playground candidate overall, but not the best first pilot.
It should arrive after the boundary and record model are proven so remote-compute complexity does not distort the initial incubation process.

## What the roadmap deliberately avoids

This roadmap is not permission to:
- create a second runtime authority
- create a plugin system early
- add unstable experimental UI straight into product
- let product behavior depend on incubation code
- skip bounded contracts because an experiment looked promising

If any roadmap step starts doing those things, the roadmap is drifting away from its purpose.

## Relationship to the main product roadmap

This incubation roadmap should not automatically replace the current product-lane work such as `COMP*`, `ABS*`, or future architecture cleanup.

Recommended interpretation:
- `PGL0` is worth capturing immediately because it is mostly governance
- `PGL1` should happen at a clean architecture pause
- `PGL3` and beyond should be chosen intentionally, not opportunistically in the middle of unrelated feature work

This keeps incubation additive rather than disruptive.

## Recommended adoption rule

No roadmap milestone should end with:
- “the app now calls Playground code”

Every adoption milestone should end with:
- “the experiment proved value, then the stable layer absorbed the idea cleanly”

That rule is worth repeating because it is the line that keeps the whole model healthy.

## Post-`PGL` continuation: `PGL-VIS`

The current `PGL` roadmap intentionally stops at incubation proof, bounded prototype contracts, and clean graduation.

It does not assume that Playground becomes calculator-visible during `PGL1` through `PGL6`.

If Calcwiz later wants a visible Playground surface inside the calculator UI, that should begin as a separate follow-on roadmap:

- `PGL-VIS`

Interpretation:
- `PGL` proves that Playground can stay architecturally subordinate
- `PGL-VIS` starts only after that proof is strong enough to justify a visible surface

Recommended first visible milestone:
- internal developer/operator Playground console only

Not recommended as the first visible step:
- a normal-user-facing Playground mode
- a visible alternate solver path in ordinary calculator UX

Related follow-on roadmap:
- `.memory/research/pgl-vis-roadmap.md`

## Sequencing question after capture

After `PGL0`, the first real sequencing question should be:
- do we take `PGL1` boundary scaffold now, or after the next product-lane capability slice?

Recommended answer:
- capture now
- implement `PGL1` at the next clean architecture pause
- start with symbolic-search incubation before remote compute

## Final recommendation

Treat this roadmap as a controlled growth model for Calcwiz's future power.

Its job is not to give experiments authority.
Its job is to let experiments earn authority safely.
