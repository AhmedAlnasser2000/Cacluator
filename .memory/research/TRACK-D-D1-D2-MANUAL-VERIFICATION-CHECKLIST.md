# Track D D1+D2 Manual Verification Checklist

## Achieved Now
- Statistics now tracks explicit dataset vs frequency-table source state, including stale-source warnings after edits.
- Manual frequency tables reject duplicate values instead of silently double-counting them.
- Descriptive statistics now report sample variance and sample standard deviation in addition to population spread.
- Statistics home now includes `Inference`, with a bounded `Mean` workflow.
- Mean inference supports:
  - one-sample confidence interval
  - two-sided one-sample `t` test
  - dataset-backed and frequency-table-backed execution

## Automated Evidence
- `npm test -- --run src/lib/statistics/parser.test.ts src/lib/statistics/core.test.ts src/lib/statistics/navigation.test.ts src/lib/statistics/engine.test.ts src/lib/statistics/inference.test.ts src/lib/guide/content.test.ts`
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`

## App Checklist

### D1 Source-State Reliability
- Step: In Statistics data entry, enter a dataset, then use `Build Table from Dataset`.
  - Expected: frequency table becomes the active source and stale flags are cleared.
  - Pass/Fail Notes: Pending manual run.
- Step: After building the table, edit the dataset.
  - Expected: frequency table is marked stale relative to the dataset.
  - Pass/Fail Notes: Pending manual run.
- Step: Edit the manual frequency table after expanding it into a dataset.
  - Expected: dataset is marked stale relative to the table.
  - Pass/Fail Notes: Pending manual run.
- Step: Enter duplicate manual frequency rows for the same numeric value.
  - Expected: controlled validation error describing duplicate values.
  - Pass/Fail Notes: Pending manual run.
- Step: Run descriptive statistics from dataset source and then from frequency-table source.
  - Expected: both execute successfully and report sample variance / sample standard deviation.
  - Pass/Fail Notes: Pending manual run.

### D2 Mean Inference
- Step: Open `Statistics > Inference > Mean` with dataset source and run a confidence interval.
  - Expected: bounded one-sample `t` confidence interval result with summary metadata.
  - Pass/Fail Notes: Pending manual run.
- Step: On the same screen, switch to two-sided test mode and provide `mu0`.
  - Expected: `t` statistic, degrees of freedom, and two-sided p-value are shown.
  - Pass/Fail Notes: Pending manual run.
- Step: Switch active source to frequency table and run the same mean inference flow.
  - Expected: weighted frequency-table inference succeeds without expanding rows manually.
  - Pass/Fail Notes: Pending manual run.
- Step: Run mean inference with `n < 2`.
  - Expected: controlled inferential error explaining sample size is insufficient.
  - Pass/Fail Notes: Pending manual run.
- Step: Run test mode without `mu0`.
  - Expected: controlled structured-request error for missing null mean.
  - Pass/Fail Notes: Pending manual run.

## Result
- Automated gate: Pass.
- Manual UI confirmation: Pending user-run notes.
