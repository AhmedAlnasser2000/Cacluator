import type {
  BinomialState,
  CorrelationState,
  DisplayOutcome,
  FrequencyTable,
  MeanInferenceState,
  NormalState,
  PoissonState,
  RegressionState,
  StatisticsScreen,
  StatisticsWorkingSource,
  StatsDataset,
} from '../../types/calculator';
import { runStatisticsCoreDraft } from './core';
import { buildStatisticsStructuredDraft } from './serializer';

type RunStatisticsModeRequest = {
  screen: StatisticsScreen;
  dataset: StatsDataset;
  frequencyTable: FrequencyTable;
  binomial: BinomialState;
  normal: NormalState;
  poisson: PoissonState;
  regression: RegressionState;
  correlation: CorrelationState;
  meanInference: MeanInferenceState;
  workingSource?: StatisticsWorkingSource;
};

export function runStatisticsMode(request: RunStatisticsModeRequest): DisplayOutcome {
  if (
    request.screen === 'home'
    || request.screen === 'probabilityHome'
    || request.screen === 'inferenceHome'
  ) {
    return {
      kind: 'error',
      title: 'Statistics',
      error: 'Choose a Statistics tool before evaluating.',
      warnings: [],
    };
  }

  const workingSource = request.workingSource
    ?? (request.screen === 'frequency' ? 'frequencyTable' : 'dataset');
  const draft = buildStatisticsStructuredDraft(
    request.screen,
    {
      dataset: request.dataset,
      frequencyTable: request.frequencyTable,
      binomial: request.binomial,
      normal: request.normal,
      poisson: request.poisson,
      meanInference: request.meanInference,
      regression: request.regression,
      correlation: request.correlation,
    },
    workingSource,
  );

  return runStatisticsCoreDraft(draft, {
    screenHint: request.screen,
    workingSourceHint: workingSource,
  }).outcome;
}
