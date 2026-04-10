# TRACK-ABS5A Manual Verification Checklist

## What Is Achieved Now
- `Equation > Symbolic` can solve deeper single-abs families by treating `t = |u|` as a bounded placeholder across shipped non-periodic outer sinks such as logarithmic, exponential/same-base, radical/root, and rational-power follow-ons.
- The abs lane now allows one extra bounded non-periodic outer layer over `t = |u|` before returning to the existing abs-placeholder sink path.
- Recognized outer non-periodic abs families now stop with more specific branch-aware guidance when they exceed the bounded outer-depth cap, produce no admissible real nonnegative `t` values, or reach only guided periodic/composition inner branches.

## Manual App Steps
1. Open `Equation > Symbolic`.
2. Enter `\sqrt{|x-1|+1}=3` and solve.
3. Enter `\ln(|x|+1)=2` and solve.
4. Enter `2^{|x-3|}=8` and solve.
5. Enter `\ln(\sqrt{|x-1|+1})=2` and solve.
6. Enter `2^{|\sin(x^3+x)|}=2^{1/2}` and solve.
7. Enter `\ln(\sqrt{\log_{2}(|x|+2)})=0` and solve.
8. Enter `2^{|\sin(x^5+x)|}=2^{1/2}` and solve.
9. Use `Numeric Solve` with a narrow interval on `\ln(|x|+1)=2`, first around `[5, 7]`, then around `[-8, -6]`.

## Expected Results
- `\sqrt{|x-1|+1}=3` returns an exact real solution set equivalent to `x \in {-7, 9}`.
- `\ln(|x|+1)=2` returns an exact real solution set equivalent to `x \in {e^2 - 1, 1 - e^2}`.
- `2^{|x-3|}=8` returns `x \in {6, 0}`.
- `\ln(\sqrt{|x-1|+1})=2` returns an exact real solution set equivalent to `x \in {e^4, 2 - e^4}`.
- `2^{|\sin(x^3+x)|}=2^{1/2}` stays exact through the already-shipped reduced-carrier periodic surface over `x^3+x`.
- `\ln(\sqrt{\log_{2}(|x|+2)})=0` stays unresolved and clearly reports that it would require more than one extra bounded non-periodic outer layer over `|u|`.
- `2^{|\sin(x^5+x)|}=2^{1/2}` stays unresolved and preserves periodic/composition context instead of mixing exact and guided output.
- Numeric Solve on `[5, 7]` reports only the positive abs branch for `\ln(|x|+1)=2`; Numeric Solve on `[-8, -6]` reports only the negative branch.
