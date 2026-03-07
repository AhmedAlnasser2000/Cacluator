import { describe, expect, it } from 'vitest';
import { runStatisticsCoreDraft } from './core';

describe('statistics core', () => {
  it('summarizes descriptive statistics from a dataset', () => {
    const { outcome } = runStatisticsCoreDraft('descriptive(values={12,15,15,18,20})', {
      screenHint: 'descriptive',
      workingSourceHint: 'dataset',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected descriptive statistics to succeed');
    }
    expect(outcome.exactLatex).toContain('\\bar{x}');
    expect(outcome.exactLatex).toContain('\\sigma');
    expect(outcome.exactLatex).toContain('s^2');
  });

  it('builds frequency output from a manual table', () => {
    const { outcome } = runStatisticsCoreDraft('frequency(freq={1:2,2:3,4:1})', {
      screenHint: 'frequency',
      workingSourceHint: 'frequencyTable',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected frequency table evaluation to succeed');
    }
    expect(outcome.approxText).toContain('1:2');
    expect(outcome.approxText).toContain('n=6');
  });

  it('evaluates bounded probability workflows', () => {
    const binomial = runStatisticsCoreDraft('binomial(n=10,p=0.5,x=3,mode=pmf)', {
      screenHint: 'binomial',
    }).outcome;
    const normal = runStatisticsCoreDraft('normal(mean=0,sd=1,x=1.96,mode=cdf)', {
      screenHint: 'normal',
    }).outcome;
    const poisson = runStatisticsCoreDraft('poisson(lambda=4,x=2,mode=pmf)', {
      screenHint: 'poisson',
    }).outcome;

    expect(binomial.kind).toBe('success');
    expect(normal.kind).toBe('success');
    expect(poisson.kind).toBe('success');
  });

  it('evaluates regression and correlation from point sets', () => {
    const regression = runStatisticsCoreDraft('regression(points={(1,2),(2,4),(3,6)})', {
      screenHint: 'regression',
    }).outcome;
    const correlation = runStatisticsCoreDraft('correlation(points={(1,2),(2,5),(3,7)})', {
      screenHint: 'correlation',
    }).outcome;

    expect(regression.kind).toBe('success');
    expect(correlation.kind).toBe('success');
    if (regression.kind !== 'success' || correlation.kind !== 'success') {
      throw new Error('Expected regression and correlation to succeed');
    }
    expect(regression.exactLatex).toContain('\\hat{y}');
    expect(regression.detailSections?.[0]?.title).toBe('Quality Summary');
    expect(regression.detailSections?.[0]?.lines.join(' ')).toContain('SSE');
    expect(correlation.approxText).toContain('positive');
    expect(correlation.detailSections?.[0]?.lines.join(' ')).toContain('Quality note');
  });

  it('adds bounded regression warnings for low sample size and omitted residual metrics', () => {
    const { outcome } = runStatisticsCoreDraft('regression(points={(1,2),(2,5)})', {
      screenHint: 'regression',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected two-point regression to succeed');
    }
    expect(outcome.warnings.join(' ')).toContain('small sample');
    expect(outcome.warnings.join(' ')).toContain('at least 3 points');
    expect(outcome.detailSections?.[0]?.lines.join(' ')).toContain('Residual variance and residual standard error need at least 3 points');
  });

  it('adds balanced weak-fit warnings for weak correlation and regression', () => {
    const regression = runStatisticsCoreDraft('regression(points={(1,0),(2,1),(3,-1),(4,0)})', {
      screenHint: 'regression',
    }).outcome;
    const correlation = runStatisticsCoreDraft('correlation(points={(1,0),(2,1),(3,-1),(4,0)})', {
      screenHint: 'correlation',
    }).outcome;

    expect(regression.kind).toBe('success');
    expect(correlation.kind).toBe('success');
    if (regression.kind !== 'success' || correlation.kind !== 'success') {
      throw new Error('Expected weak-fit cases to succeed');
    }
    expect(regression.warnings.join(' ')).toContain('Weak linear fit');
    expect(correlation.warnings.join(' ')).toContain('Weak linear fit');
  });

  it('runs bounded mean inference from a dataset and a frequency table', () => {
    const ci = runStatisticsCoreDraft('meanInference(values={12,15,15,18,20}, mode=ci, level=0.95)', {
      screenHint: 'meanInference',
      workingSourceHint: 'dataset',
    }).outcome;
    const test = runStatisticsCoreDraft('meanInference(freq={1:2,2:3,4:1}, mode=test, level=0.95, mu0=2)', {
      screenHint: 'meanInference',
      workingSourceHint: 'frequencyTable',
    }).outcome;

    expect(ci.kind).toBe('success');
    expect(test.kind).toBe('success');
    if (ci.kind !== 'success' || test.kind !== 'success') {
      throw new Error('Expected mean inference to succeed');
    }
    expect(ci.approxText).toContain('CI');
    expect(test.approxText).toContain('two-sided t-test');
  });

  it('returns controlled errors for invalid statistics input', () => {
    const { outcome } = runStatisticsCoreDraft('binomial(n=2.5,p=1.2,x=-1,mode=pmf)', {
      screenHint: 'binomial',
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected invalid binomial input to fail');
    }
    expect(outcome.error).toContain('n');
  });

  it('rejects duplicate manual frequency values', () => {
    const { outcome } = runStatisticsCoreDraft('frequency(freq={1:2,1:3})', {
      screenHint: 'frequency',
      workingSourceHint: 'frequencyTable',
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected duplicate frequency values to fail');
    }
    expect(outcome.error).toContain('duplicated');
  });
});
