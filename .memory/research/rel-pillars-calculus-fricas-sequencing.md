# REL/PILLARS, Calculus Follow-Through, And FriCAS Context Sequencing

Status: sequencing memory and research-boundary capture only. This is not a product implementation milestone.

Recorded: 2026-04-27

## Source Context

- External planning note: `<local-source>/calcwiz_rel_pillars_roadmap.md`
- Live discussion: FriCAS should become a deep comparative context source, not a Calcwiz dependency or identity template.
- Current repo state: `REL0` is committed, `CALC-INT1` is complete, and Version 1 remains Linux-first.

## Clean-Base Priority

The next work should not jump directly back into math breadth or FriCAS research.

Preferred clean-base order:

1. `REL1` - first Linux preview release pipeline. Completed.
2. `PILLARS0` - minimal public-quality Calcwiz pillars baseline. Completed.
3. `MATH-GOLDEN0` - golden math regression corpus for shipped behavior. Completed.
4. `CALC-POLISH1` - calculus readback, Guide, history/replay, and UX consistency for the calculus core already established. Completed.
5. `DOCS0` / `TRIAGE0` / `SEC0` as public traffic pressure requires.

The broader `REL/PILLARS` roadmap remains the public-release hardening lane:

- `REL1`
- `PILLARS0`
- `MATH-GOLDEN0`
- `OBS0`
- `CONFIG0`
- `DOCS0`
- `TRIAGE0`
- `SEC0`
- `UX-REL0`

Not every item must block the first preview binary. `REL1`, `PILLARS0`, `MATH-GOLDEN0`, and `CALC-POLISH1` are complete; the next default move is incubation-system strengthening before `FRICAS-CTX0`, unless public traffic makes `DOCS0`, `TRIAGE0`, `SEC0`, or another release-hardening slice more urgent.

## What Remains From The Calculus Core Roadmap

Completed calculus foundation:

- `CALC-AUDIT0`
- `CALC-CORE1`
- `CALC-CORE2`
- `CALC-CORE3`
- `CALC-COMP1`
- `CALC-DIFF1`
- `CALC-LIM1`
- `CALC-LIM2`
- `CALC-LIM3`
- `domain-range-CORE1`
- `CALC-INT1`
- `CALC-POLISH1`

Immediate remaining calculus follow-through:

- None currently locked. Future calculus work should be selected only after public-release pressure and the incubation-system strengthening lane are reviewed.

Parked or later calculus candidates:

- `CALC-COMP2`: mostly absorbed by `CALC-DIFF1`; reopen only for a concrete derivative readback/domain blocker.
- `CALC-SER1`: stronger series behavior after the current calculus surface is polished.
- `CALC-PARTIAL1`: partial derivative polish after single-variable calculus settles.
- `CALC-ODE1`: ODE UX and numeric IVP hardening after the main calculus lane is stable.
- `CALC-PLAY1`: speculative integration/search experiments in Playground only if bounded stable rules stop paying off.

## FriCAS Context Mirror Direction

Proposed lane name:

- `FRICAS-CTX0` - FriCAS Context Mirror And Research Boundary

Purpose:

- Study FriCAS as a high-power symbolic context source.
- Understand what enables broad symbolic capability.
- Translate only suitable ideas into Calcwiz-native, bounded, exact-first forms.

Hard boundaries:

- FriCAS is context, not authority.
- FriCAS must not become a Calcwiz runtime dependency.
- Do not import, call, build against, or submodule FriCAS in the stable product.
- Do not copy FriCAS code into Calcwiz by default.
- If code reuse is ever considered, stop and document exact source, license implications, why reuse is necessary, and why a Calcwiz-native rewrite is not preferred.
- FriCAS-inspired ideas must pass through the Playground/incubation ladder before stable adoption.
- Stable Calcwiz code must never depend on FriCAS-origin experimental code.

Preferred mirror shape:

- Keep the FriCAS research mirror outside the main Calcwiz repo, for example as a sibling `fricas-context-lab` repository.
- Bring back only distilled research artifacts, benchmark/correctness corpora, and bounded experiment specs.

Candidate Calcwiz artifacts later:

- `.memory/research/fricas-context-memo.md`
- `.memory/research/fricas-capability-atlas.md`
- `.memory/research/fricas-calcwiz-fit-matrix.md`
- `.memory/research/fricas-idea-ledger.md`
- `playground/records/fricas-context-atlas.md`

Priority research outputs:

1. FriCAS context memo.
2. FriCAS capability atlas.
3. Calcwiz fit matrix.
4. Idea extraction ledger.
5. Top 10 research-to-prototype candidates.
6. First Playground incubation proposals.

Priority areas to study:

- polynomial algebra
- Groebner bases / regular chains / elimination
- symbolic integration / Risch-related capability
- assumptions, domains, and type behavior
- exact algebraic structures
- simplification / rewriting / normalization
- exact linear algebra / vectors / tensors
- series and special functions
- interpreter/type-system interplay
- package/domain architecture
- performance and representation choices

## Translation Rule

Every valuable FriCAS idea must be translated into a Calcwiz-native bounded form before it can be considered for adoption.

The default path is:

1. understand
2. analyze
3. restate
4. redesign
5. prototype in Playground if appropriate
6. adopt only by extraction into stable Calcwiz architecture

Do not optimize for imitation. Optimize for understanding, translation, and bounded extraction.

## Sequencing Decision

`FRICAS-CTX0` is valuable, but it should not interrupt the immediate public-release foundation lane.

Near-term priority:

1. finish `REL/PILLARS` clean-base work enough for public trust
2. complete the remaining calculus polish surface from the established calculus core
3. strengthen the Playground/incubation system itself before asking it to carry a large external-context lane
4. then start FriCAS context research as an isolated, non-product comparative study

FriCAS should not be the next pressure test for a still-light incubation system. Before `FRICAS-CTX0`, add a dedicated incubation-improvement step that upgrades record quality, evidence expectations, review discipline, corpus handling, and graduation/retirement mechanics enough to host large context-derived research without contaminating stable product code.
