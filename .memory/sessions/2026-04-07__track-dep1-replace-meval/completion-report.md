# DEP1 Completion Report

- Date: 2026-04-07
- Scope: replace the Rust numeric ODE evaluator dependency `meval` with a maintained parser/evaluator and verify the old `nom v1` future-incompat warning disappears.

## What changed
- Replaced `meval = "0.2"` with `mathexpr = "0.1.1"` in `src-tauri/Cargo.toml`.
- Updated `src-tauri/src/lib.rs`:
  - added `compile_ode_expression()` to parse/compile ODE RHS expressions once with variables `x` and `y`
  - changed RK4 / RK45 evaluation to reuse compiled `mathexpr` executables
  - added Rust tests for supported ODE math-surface compilation/evaluation, non-finite-step rejection, and a simple RK4 IVP solve

## Outcome
- The backend no longer depends on `meval`.
- `cargo tree -i nom` now resolves through `mathexpr -> nom v8.0.0` instead of the old `meval -> nom v1.2.4` chain.
- Full project verification passed after the swap.
