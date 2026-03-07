import { describe, expect, it } from 'vitest';
import {
  computeMeanConfidenceInterval,
  computeMeanHypothesisTest,
  inverseStudentTCdf,
  parseInferenceLevel,
  studentTCdf,
} from './inference';

describe('statistics inference helpers', () => {
  it('parses bounded confidence levels', () => {
    expect(parseInferenceLevel('0.95')).toBe(0.95);
    expect(parseInferenceLevel('1')).toBeNull();
    expect(parseInferenceLevel('0')).toBeNull();
  });

  it('computes stable student t helper values', () => {
    const cdf = studentTCdf(0, 4);
    const critical = inverseStudentTCdf(0.975, 4);

    expect(cdf).toBeCloseTo(0.5, 12);
    expect(critical).toBeCloseTo(2.776, 2);
  });

  it('computes one-sample mean confidence intervals and tests', () => {
    const summary = {
      count: 5,
      mean: 16,
      sampleVariance: 9.5,
      sampleStandardDeviation: Math.sqrt(9.5),
    };

    const ci = computeMeanConfidenceInterval(summary, 0.95);
    const test = computeMeanHypothesisTest(summary, 0.95, 15);

    expect(ci).not.toBeNull();
    expect(test).not.toBeNull();
    if (!ci || !test) {
      throw new Error('Expected bounded mean inference results');
    }

    expect(ci.lowerBound).toBeLessThan(summary.mean);
    expect(ci.upperBound).toBeGreaterThan(summary.mean);
    expect(test.pValue).toBeGreaterThanOrEqual(0);
    expect(test.pValue).toBeLessThanOrEqual(1);
  });
});
