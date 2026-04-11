# TRACK ABS5B Manual Verification Checklist

## Goal
- Confirm that `ABS5B` keeps the `ABS5A` solve surface unchanged while making outer-nonperiodic abs results read more deliberately and making unresolved boundaries more specific.

## Exact readback checks
- `\ln(|x|+1)=2`
  - Expect exact success.
  - Expect a short solve summary.
  - Expect an `Absolute-Value Reduction` detail section showing `t = |x|`.
- `\sqrt{|x^2-1|+1}=3`
  - Expect exact success.
  - Expect exact branch closure with no `Exact Closure Boundary` section.
- `\ln(\sqrt{|x-1|+1})=2`
  - Expect exact success.
  - Expect exact reduction context in details without duplicated wording in the solve summary.
- `2^{|\sin(x^3+x)|}=2^{1/2}`
  - Expect exact success.
  - Expect abs detail sections plus preserved periodic-family metadata.
  - Expect the abs context to read like exact context, not like a stop reason.

## Guided boundary checks
- `\ln(\sqrt{\log_{2}(|x|+2)})=0`
  - Expect guided/error outcome with an `Exact Closure Boundary` section.
  - Expect the boundary wording to describe the bounded outer non-periodic depth limit.
- `2^{|\sin(x^5+x)|}=2^{1/2}`
  - Expect guided/error outcome.
  - Expect abs boundary context plus preserved periodic-family context.
- `\sqrt{|x|+\sqrt{x+1}}=3`
  - Expect unresolved/guided behavior because the surface mixes multiple variable-dependent families outside the admitted single-placeholder abs contract.

## Interval guidance checks
- `\ln(|x|+1)=2` on `[5, 7]`
  - Expect guidance/result behavior that isolates only the positive branch.
- `\ln(|x|+1)=2` on `[-8, -6]`
  - Expect guidance/result behavior that isolates only the negative branch.
- `\ln(|x|+1)=2` on `[-0.5, 0.5]`
  - Expect branch-aware messaging that the chosen interval misses all admissible branches.
- `2^{|\sin(x^5+x)|}=2^{1/2}` with a narrow interval away from valid branches
  - Expect branch-aware guidance that preserves the composition-backed blocker context.
