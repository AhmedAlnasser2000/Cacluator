# Composition Reference Notes

## Purpose
Preserve external discussion/context around symbolic composition so later planning does not flatten these sources into stronger claims than they support.

## 1. Comparative ecosystem PDF
- File: `C:\Users\ahmed\Downloads\Comparative Software Analysis of GeoGebra, Desmos, Casio Graphing Software, TI Graphing Software, an.pdf`
- What it is:
  - a comparative software/ecosystem report across GeoGebra, Desmos, Casio software, TI software, and Wolfram as auxiliary tooling
  - strongest for vendor-positioning, platform shape, API/embedding posture, and broad CAS-role comparison
- What it supports well:
  - GeoGebra is the most relevant educational graphing/CAS benchmark in the set because of Giac integration
  - Desmos is graphing/embedding-first and is not positioned in the report as a general-purpose CAS benchmark
  - Casio and TI software have CAS-capable products, but the report does not deeply characterize their symbolic solver limits
  - Wolfram is the strongest symbolic/CAS auxiliary reference point, but not a direct classroom-graphing UX equivalent
- What it does **not** support:
  - exact claims about symbolic composition depth limits
  - exact claims about periodic-family closure, affine sawtooth closure, inverse/direct trig behavior, or where each product numerically falls back
  - statements like “product X solves up to depth N compositions”
- How to use it later:
  - use it to choose who Calcwiz should benchmark against
  - do **not** use it as evidence for concrete composition solver stopping rules

## 2. Calcwiz Vision PDF
- File: `C:\Users\ahmed\Downloads\Calcwiz Vision.pdf`
- What it is:
  - a long-term product and architecture vision document
- Major themes captured:
  - Calcwiz is intended to become an open modular math platform, not only a calculator app
  - exact-first, bounded-but-honest symbolic behavior is part of the intended identity
  - long-term architecture points toward reusable cores (`expr_core`, `symbolic_core`, `numeric_core`, `graph_core`, `progressive_solver`, `profile_runtime`, etc.)
  - Rust-first migration is a future engine direction, but not through a big-bang rewrite
  - progressive solving, resumable work, and selective local/remote compute profiles are part of the long-range vision
  - graphing should be deeply integrated with symbolic and numeric analysis, not bolted on
- How to use it later:
  - treat it as a north-star document for roadmap alignment and architecture choices
  - do not confuse it with current shipped state; it describes intended direction, not current implementation breadth

## 3. Composition limits markdown
- File: `C:\Users\ahmed\Downloads\codex_symbolic_composition_limits_spec.md`
- What it is:
  - a design note from a ChatGPT/Codex discussion about how symbolic composition limits should ideally be modeled
- Main proposal in the document:
  - avoid hard symbolic depth caps as the primary rule
  - prefer semantic boundaries and budget boundaries
  - return structured stop reasons like `unsupported_exact_form`, `branch_ambiguity`, `non_elementary_result`, `rewrite_step_budget_exceeded`, and similar
  - treat depth as metadata/heuristic input, not the core correctness cutoff
  - move toward solver budgets (`rewrite steps`, `expression growth`, `time`, `memory`) rather than “we only solve up to depth 3”
- Important status note:
  - this is **not** current Calcwiz runtime behavior
  - current Calcwiz composition behavior is still milestone-bounded (`COMP1` through `COMP8`) with explicit guarded limits and structured stops specific to the implemented solver surface
- How to use it later:
  - treat it as a future design reference when/if Calcwiz composition becomes strong enough to justify budget-driven unbounded reduction
  - do not cite it as if the current engine already follows that contract

## Practical memory rule
- When future planning mentions “composition limits,” distinguish clearly between:
  - current implemented Calcwiz behavior
  - future design proposals from the composition-limits markdown
  - broad competitor positioning from the comparative ecosystem PDF
  - long-term direction from the Calcwiz Vision PDF

## 4. Internal synthesis: what Calcwiz adopts vs defers

### Adopt now at the architecture/philosophy level
- Depth alone is a poor predictor of symbolic difficulty.
- Structured stop reasons are better than fake symbolic closure.
- Long-term solver evolution should move toward semantic boundaries and resource budgets, not only raw layer counting.
- Partial success should be explicit: exact result, partially exact structured result, or numeric guidance.

### Defer for now
- Replacing the current milestone-bounded composition policy with a fully budget-driven unbounded symbolic composition engine.
- Treating raw composition depth as a user-facing promise like “depth 7 means it will solve exactly.”
- Unifying all composition behavior across simplification, equation solving, differentiation, limits, and integration under one immediate shared contract.

### Why defer
- Current Calcwiz composition growth has been milestone-based (`COMP1` through `COMP8`) for correctness, predictability, and regression safety.
- Equation composition has harder failure modes than the markdown’s broad framing suggests, especially:
  - periodic-family growth
  - inverse/direct trig sawtooth behavior
  - principal-range constraints
  - multi-parameter branch explosions
- Bounded milestone caps were the correct implementation strategy for the current phase of the product.

### What would need to change before the markdown becomes real runtime policy
- A richer structured stop-reason model across solver surfaces, not just the current composition-specific stop taxonomy.
- Solver-budget instrumentation for:
  - rewrite steps
  - intermediate expression growth
  - branch count / periodic-parameter growth
  - time budget
  - memory budget
- Better empirical benchmarking against competitor/reference systems and against Calcwiz’s own composition suites.
- Clear separation of composition policy by domain:
  - equation solving
  - simplification
  - differentiation
  - limits
  - integration

### Current recommended interpretation
- The composition-limits markdown is a **future architecture note**.
- It should influence later solver-budget design.
- It should **not** overwrite the fact that current Calcwiz composition behavior is intentionally milestone-bounded and explicit about its supported exact surface.
