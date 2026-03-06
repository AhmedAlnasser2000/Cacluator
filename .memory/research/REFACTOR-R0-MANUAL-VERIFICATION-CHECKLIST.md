# Refactor R0 Manual Verification Checklist

Date: 2026-03-05
Gate: R0 (Safety Baseline)
Scope: characterization test baseline before structural decomposition

## Achieved Now
- Added solver parity contract tests for bounded trig, range-guard impossible, log-combine, and mixed-base recognized-unresolved behavior.
- Added guide content parity contract tests for track-critical article IDs, capability-gated active article presence, and key mode-ref coverage.
- Added this checklist as the R0 manual verification artifact.

## App Steps
1. Open Equation > Symbolic and run `sin(2x)=0`.
Expected: success result with trig solve provenance.
Pass/Fail: Pass (validated via solver parity/unit tests + full regression gate on 2026-03-06).

2. Open Equation > Symbolic and run `sin(x^2)=5`.
Expected: hard stop with `Range Guard` no-real-solution messaging.
Pass/Fail: Pass (validated via range-impossibility tests + full regression gate on 2026-03-06).

3. Open Equation > Symbolic and run `ln(x)+ln(x+1)=2`.
Expected: bounded log-combine path succeeds with log-combine provenance.
Pass/Fail: Pass (validated via guarded/shared-solve tests + full regression gate on 2026-03-06).

4. Open Equation > Symbolic and run `log_4(4x)+log(6x)=5`.
Expected: recognized mixed-base family message with interval guidance (no generic unsupported fallback).
Pass/Fail: Pass (validated via solver parity/shared-solve tests + full regression gate on 2026-03-06).

5. Open Guide and verify key articles exist and open:
Expected: `Algebra Equations`, `Trig Equations`, `Geometry Solids (3D)`, `Statistics Probability`, and `Advanced Integrals`.
Pass/Fail: Pass (validated via guide content contract/content tests + full regression gate on 2026-03-06).

## Evidence Commands
1. `npm test -- --run`
2. `npm run build`
3. `npm run lint`
4. `cargo check`

## Notes
- Keep this checklist updated with pass/fail outcomes before moving to R1 extraction work.
