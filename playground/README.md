# Calcwiz Playground

The Playground is Calcwiz's incubation area for experiments that are promising but not yet trustworthy enough for stable product code.

## What it is

- a level-based incubation system
- a safe place to test frontier ideas
- a proving ground for future capability

## What it is not

- not a production subsystem
- not a second runtime authority
- not a shortcut dependency source for stable app code

## Dependency rule

Playground code may import from stable product code when reuse is useful.

Stable product code under `src/` must never import from `playground/`.

That one-way rule is enforced in ESLint for TypeScript product code.

## Source mirror rule

External CAS/math repositories used for research context belong in `playground/sources/`.

- committed metadata lives under `playground/sources/metadata/`
- local clones live only under ignored `playground/sources/mirrors/<mirror-id>/`
- source mirrors are context only, not product dependencies
- useful ideas must be translated into Calcwiz-native bounded experiments before any stable adoption
- direct code copying is forbidden by default and requires an explicit stop-and-review note before it is even considered

## Graduation rule

Successful experiments do not become product features by direct reuse.

They graduate by:
1. proving value here
2. becoming bounded and explainable
3. being extracted or rewritten into the correct stable layer
4. gaining real tests and product-facing contracts there

## Levels in this tree

- `level-0-research/`: raw ideas, sketches, comparisons
- `level-1-feasibility/`: repeated examples and early proof of usefulness
- `level-2-bounded-prototypes/`: constrained, explainable experiments with known limits
- `level-3-integration-candidates/`: experiments close enough to discuss stable adoption

Levels 4 and 5 do not live here. Once a capability is adopted or mature, it belongs in stable product architecture instead of Playground.

## Required experiment metadata

Every meaningful experiment should record:
- `experiment_id`
- `title`
- `owner`
- `lane_topic`
- `current_level`
- `status`
- `date_started`
- `last_reviewed`
- `next_review`
- `candidate_stable_home`
- `companion_manifest`
- hypothesis
- in-scope cases
- out-of-scope cases
- known stop reasons
- success criteria
- promotion criteria
- retirement criteria

Use the canonical templates in `playground/templates/`.

Status vocabulary:
- `draft`: proposed but not yet running
- `active`: currently being explored or reviewed
- `paused`: intentionally postponed without rejecting the experiment
- `promoted`: moved forward into a follow-on experiment or stable adoption discussion
- `retired`: stopped or archived after review

Markdown records are authoritative.
YAML manifests are companion summaries only and exist for indexing and future lightweight tooling.

Every real experiment should have:
- a Markdown record
- a companion YAML manifest
- an entry in `playground/records/INDEX.md`

Promotion and retirement reviews should use the shared checklist templates.

## What PGL1 includes

`PGL1` intentionally includes:
- this boundary scaffold
- starter records/templates
- import-fence enforcement

`PGL2` is the first refinement of that starter system. It adds:
- canonical record metadata
- a records index
- shared promotion/retirement checklist templates
- a seeded symbolic-search starter experiment
- companion YAML manifests without automation

`PGL3` now adds:
- a dedicated `npm run test:playground` lab harness
- a tiny guarded-stage replay seam for non-product experiments
- a fixed symbolic-search corpus for `sym-search-planner-ordering`
- experiment evidence written back into the authoritative Playground record

`PGL4` now adds:
- an `external-compute` foundations lane under `level-0-research/`
- provider-neutral runner/job/artifact contracts shaped for future SSH use
- a checked-in SSH profile template plus ignored local `*.local.json` profiles
- a local harness that proves the contract over the real `sym-search-planner-ordering` workload
- structural SSH validation only; no real remote execution yet

`PGL5` now adds:
- one real VM-first SSH pilot over `sym-search-planner-ordering`
- JSON upload, remote execution, artifact pullback, and local parity reporting

`PGL5+` now adds:
- SSH preflight checks and step-level timeout/retry handling
- explicit failure classes and provenance on the local SSH manifest
- one checked-in operator command for live VM runs instead of handwritten `.task_tmp` scripts

After the 2026-04-24 sequencing review, the external-compute lane is `paused` rather than adopted or retired. The VM-first proof is preserved, but provider-host expansion should wait until the core calculator, solver roadmap, and incubation system are more stable.

`PGL1` and `PGL2` intentionally do not include:
- workflow automation
- schema validation
- experiment execution infrastructure
- any direct stable runtime dependency on Playground
