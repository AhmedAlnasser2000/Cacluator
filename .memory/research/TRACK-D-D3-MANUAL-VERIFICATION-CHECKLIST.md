# Track D D3 Manual Verification Checklist

## Achieved Now
- Statistics `Regression` now adds:
  - `SSE`
  - residual variance / `MSE` when `n >= 3`
  - residual standard error when `n >= 3`
  - bounded fit-quality warnings for low sample size and weak/moderate fit
- Statistics `Correlation` now adds a `Quality Summary` with bounded strength notes and the same balanced warning policy.
- Result cards can now render a reusable `Quality Summary` detail section without adding a new Statistics subscreen.
- Statistics regression guide copy now explains residual diagnostics and non-causal correlation wording.

## Automated Evidence
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`

## App Checklist

### Regression
- Step: Open `Statistics > Regression` and enter `(1,2), (2,4), (3,6)`.
  - Expected: success result with line fit, `r`, `r²`, and a `Quality Summary` showing `SSE = 0`, residual variance `0`, and residual standard error `0`.
  - Pass/Fail Notes: Pending manual run.
- Step: Enter a two-point regression such as `(1,2), (2,5)`.
  - Expected: success result with `Quality Summary` showing `SSE`, plus a warning that residual variance and residual standard error need at least 3 points.
  - Pass/Fail Notes: Pending manual run.
- Step: Enter a weak-fit example such as `(1,0), (2,1), (3,-1), (4,0)`.
  - Expected: success result with weak-fit warning and a `Quality Summary` line describing weak linear relationship.
  - Pass/Fail Notes: Pending manual run.

### Correlation
- Step: Open `Statistics > Correlation` and enter a strong positive set such as `(1,2), (2,5), (3,7), (4,10)`.
  - Expected: success result with strong positive summary and a `Quality Summary` note describing strong linear relationship.
  - Pass/Fail Notes: Pending manual run.
- Step: Enter the weak-fit set `(1,0), (2,1), (3,-1), (4,0)`.
  - Expected: success result with weak-fit warning and a `Quality Summary` note describing weak linear relationship.
  - Pass/Fail Notes: Pending manual run.
- Step: Enter a low-sample correlation set with only two points.
  - Expected: success result with low-sample warning but no new regression-inference UI.
  - Pass/Fail Notes: Pending manual run.

### Guide / UI
- Step: Open the Statistics regression guide article.
  - Expected: guide copy now mentions `SSE`, residual-size diagnostics, small-sample caution, and that correlation is not causation.
  - Pass/Fail Notes: Pending manual run.
- Step: Compare Regression and Correlation result cards with another Statistics tool such as `Mean Inference`.
  - Expected: only regression/correlation show the new `Quality Summary` section; other Statistics tools keep the old result-card shape.
  - Pass/Fail Notes: Pending manual run.

## Result
- Automated gate: Pass.
- Manual UI confirmation: Pending user-run notes.
