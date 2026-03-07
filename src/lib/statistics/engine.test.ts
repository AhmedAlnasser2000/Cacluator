import { describe, expect, it } from 'vitest';
import { runStatisticsMode } from './engine';
import {
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_CORRELATION_STATE,
  DEFAULT_FREQUENCY_TABLE,
  DEFAULT_MEAN_INFERENCE_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
  DEFAULT_REGRESSION_STATE,
  DEFAULT_STATS_DATASET,
} from './examples';

const baseRequest = {
  dataset: DEFAULT_STATS_DATASET,
  frequencyTable: DEFAULT_FREQUENCY_TABLE,
  binomial: DEFAULT_BINOMIAL_STATE,
  normal: DEFAULT_NORMAL_STATE,
  poisson: DEFAULT_POISSON_STATE,
  meanInference: DEFAULT_MEAN_INFERENCE_STATE,
  regression: DEFAULT_REGRESSION_STATE,
  correlation: DEFAULT_CORRELATION_STATE,
};

describe('statistics engine', () => {
  it('summarizes descriptive statistics from the dataset', () => {
    const outcome = runStatisticsMode({
      screen: 'descriptive',
      workingSource: 'dataset',
      ...baseRequest,
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected descriptive statistics to succeed');
    }
    expect(outcome.exactLatex).toContain('\\bar{x}');
    expect(outcome.exactLatex).toContain('n=5');
  });

  it('builds a frequency summary from the dataset', () => {
    const outcome = runStatisticsMode({
      screen: 'frequency',
      workingSource: 'dataset',
      ...baseRequest,
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected frequency summary to succeed');
    }
    expect(outcome.approxText).toContain('15:2');
  });

  it('runs mean inference from the active statistics source', () => {
    const outcome = runStatisticsMode({
      screen: 'meanInference',
      workingSource: 'dataset',
      ...baseRequest,
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected mean inference to succeed');
    }
    expect(outcome.approxText).toContain('CI');
  });
});
