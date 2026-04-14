# Symbolic Search Planner Ordering and Heuristic Ranking

## Metadata

- experiment_id: `sym-search-planner-ordering`
- title: `Symbolic Search Planner Ordering and Heuristic Ranking`
- owner: `unassigned`
- lane_topic: `symbolic-search`
- current_level: `level-0-research`
- status: `active`
- date_started: `2026-04-11`
- last_reviewed: `2026-04-11`
- next_review: `2026-04-18`
- candidate_stable_home: `equation symbolic orchestration`
- companion_manifest: `playground/manifests/sym-search-planner-ordering.yaml`

## Hypothesis

- Limited heuristic ranking over already-shipped bounded solver stages and transform families may improve symbolic solve yield or result quality on hard examples without weakening stop honesty.

## Why It Matters

- Calcwiz already has a strong set of bounded algebra cores and orchestrated solve stages.
- Some difficult symbolic problems may benefit from better ordering or ranking across already-shipped bounded strategies before the project commits to broader math-family expansion.
- This is a strong first Playground lane because it can reuse stable cores immediately without requiring remote compute or a new runtime authority.

## In Scope

- Comparing order and ranking across already-shipped bounded cores.
- Measuring whether different bounded search orderings produce better outcomes on selected symbolic examples.
- Documenting candidate success and failure families.
- Comparing planner/order effects without changing the stable product solve path.

## Out Of Scope

- New math-family implementation.
- Unbounded search.
- External compute.
- UI exposure.
- Stable app integration.
- Product adoption decisions.

## Known Stop Reasons

- Search must stay inside already-shipped bounded families only.
- No new exact families are allowed in this experiment.
- Any strategy that depends on unstable or unbounded recursion is rejected from this starter lane.
- Any strategy that would require stable product code to depend on Playground is disallowed.

## Success Criteria

- Produce a small set of symbolic comparison examples where ordering differences are visible and interpretable.
- Identify whether heuristic ranking appears useful enough to justify Level 1 feasibility work.
- Preserve honest bounded-stop behavior in every comparison.

## Promotion Criteria

- There is enough evidence to justify entry into `level-1-feasibility`.
- The experiment can name a bounded set of candidate examples and comparison methods.
- The next review can ask a concrete feasibility question instead of a vague research question.

## Retirement Criteria

- No useful comparison signal appears over current bounded ordering.
- The experiment can only progress by violating boundedness or stop honesty.
- A better symbolic-search incubation candidate clearly supersedes this one.

## Compared Planner Orders

- `baseline-default`
  - current guarded solver stage order exported from stable code
- `recursive-first`
  - `numeric-interval`
  - `bounded-polynomial`
  - `composition`
  - `algebra-transform`
  - `substitution`
  - `direct-trig`
  - `rewrite-trig`
  - `direct-symbolic`
- `trig-rewrite-first`
  - `numeric-interval`
  - `bounded-polynomial`
  - `direct-trig`
  - `rewrite-trig`
  - `composition`
  - `algebra-transform`
  - `substitution`
  - `direct-symbolic`

## Fixed Corpus

1. `\sin\left(x^2+x\right)=\frac{1}{2}` — exact-capable
2. `\sin\left(x^3+x\right)=\frac{1}{2}` — exact-capable
3. `\sin\left(\sqrt{x+1}-2\right)=\frac{1}{2}` — exact-capable
4. `\sin\left(\left|x-1\right|\right)=\frac{1}{2}` — exact-capable, abs/composition boundary
5. `\sin\left(\ln\left(x+1\right)-2\right)=\frac{1}{2}` — exact-capable
6. `\sin\left(\ln\left(x+1\right)\right)=\frac{1}{2}` — exact-capable, explicit-`x` preference
7. `2^{\left|\sin\left(x^3+x\right)\right|}=2^{\frac{1}{2}}` — exact-capable, abs/composition boundary
8. `2^{\left|\sin\left(x^5+x\right)\right|}=2^{\frac{1}{2}}` — honest-stop preservation, abs/composition boundary
9. `\sin\left(\sqrt{x+1}+x^{\frac{1}{3}}\right)=\frac{1}{2}` — honest-stop preservation
10. `\arcsin\left(\sin\left(\ln\left(\sqrt{x+1}+\sqrt{x}\right)\right)\right)=\frac{1}{2}` — honest-stop preservation
11. `\sqrt{x+\sqrt{5-x}}=2` — exact-capable, transform-heavy exact
12. `\ln\left(\sqrt{\log_{3}\left((x+1)^2\right)}\right)=2` — exact-capable, transform-heavy exact

## Result Summary

- Baseline replay matched the stable default guarded solver on all 12 corpus cases.
- `recursive-first` produced:
  - `0` exact improvements
  - `0` exact regressions
  - `0` preference regressions
  - `1` honesty regression
  - `11` trace-only differences
  - `2` cleaner bounded-path wins
- `trig-rewrite-first` produced:
  - `0` exact improvements
  - `0` exact regressions
  - `0` preference regressions
  - `1` honesty regression
  - `11` trace-only differences
  - `0` cleaner bounded-path wins

## Observed Wins And Regressions

- No alternate ordering found a new exact symbolic win on the fixed 12-case corpus.
- `recursive-first` did shorten the trace on two exact-capable cases:
  - `nested-sawtooth-guided-boundary`
  - `nested-log-radical-transform-exact`
- Both alternate orderings shifted several cases from `algebra-transform` wins to `composition` wins without improving the final result class.
- Both alternate orderings introduced the same guardrail failure on:
  - `abs-composition-guided-boundary`
  - equation: `2^{\left|\sin\left(x^5+x\right)\right|}=2^{\frac{1}{2}}`
  - classification: `honesty_regression`
- Because the regression is on a guided abs/composition boundary case, the current evidence says whole-stage reordering is not yet safe enough for feasibility promotion.

## Promotion Decision

- Decision: keep `sym-search-planner-ordering` at `level-0-research`.
- Rationale:
  - promotion requires zero honesty regressions, zero preference regressions, and zero exact regressions on exact-capable guard cases
  - both alternate orderings failed that bar because they each introduced one honesty regression
  - neither alternate ordering produced any exact improvement
- Next review should focus on narrower guardrail-preserving heuristics, not broader whole-stage reordering.

## External Compute Reuse Note

- `sym-search-planner-ordering` is now reused as the first remote workload proof for `ext-compute-ssh-vm-pilot`.
- That reuse does not change the symbolic-search result recorded above.
- The symbolic-search lane remains `level-0-research` until a later review proves safer heuristics or a better pilot direction.
