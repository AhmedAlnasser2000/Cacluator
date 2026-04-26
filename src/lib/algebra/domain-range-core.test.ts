import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  checkOneSidedRealDomain,
  checkPointRealDomain,
  checkRealIntervalSafety,
  collectRealDomainConstraints,
  proveRealRange,
} from './domain-range-core';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

describe('domain-range-core', () => {
  it('collects bounded real-domain constraints from common carriers', () => {
    const rational = collectRealDomainConstraints(node('\\frac{1}{x-1}'));
    const log = collectRealDomainConstraints(node('\\ln(x-2)'));
    const root = collectRealDomainConstraints(node('\\sqrt{x+1}'));
    const negativePower = collectRealDomainConstraints(node('(x+2)^{-1}'));
    const inverseTrig = collectRealDomainConstraints(node('\\arcsin(x+3)'));

    expect(rational.some((constraint) => constraint.kind === 'nonzero')).toBe(true);
    expect(log.some((constraint) => constraint.kind === 'positive')).toBe(true);
    expect(root.some((constraint) => constraint.kind === 'nonnegative')).toBe(true);
    expect(negativePower.some((constraint) => constraint.kind === 'nonzero')).toBe(true);
    expect(inverseTrig.some((constraint) => constraint.kind === 'expression-interval')).toBe(true);
  });

  it('proves simple real ranges for shared equation and calculus consumers', () => {
    const root = proveRealRange(node('\\sqrt{x}'));
    const absolute = proveRealRange(node('\\left|x-2\\right|'));
    const exponential = proveRealRange(node('e^x'));
    const trig = proveRealRange(node('\\sin(x)\\cos(x)'));
    const boundedSum = proveRealRange(node('\\sin(x)+\\cos(x)'));

    expect(root.kind).toBe('exact');
    expect(root.kind === 'exact' ? root.reason : undefined).toBe('principal-root');
    expect(absolute.kind).toBe('exact');
    expect(absolute.kind === 'exact' ? absolute.reason : undefined).toBe('absolute-value');
    expect(exponential.kind).toBe('exact');
    expect(exponential.kind === 'exact' ? exponential.reason : undefined).toBe('positive-exponential');
    expect(trig.kind).toBe('exact');
    expect(trig.kind === 'exact' ? trig.reason : undefined).toBe('bounded-product');
    expect(boundedSum.kind).toBe('exact');
    expect(boundedSum.kind === 'exact' ? boundedSum.reason : undefined).toBe('bounded-sum');
  });

  it('checks points and one-sided neighborhoods for real-domain safety', () => {
    expect(checkPointRealDomain({ node: node('\\ln(x)'), value: 0 })?.message).toContain('non-positive');
    expect(checkOneSidedRealDomain({ node: node('\\ln(x)'), target: 0, direction: 'left' }).kind).toBe('outside-domain');
    expect(checkOneSidedRealDomain({ node: node('\\ln(x)'), target: 0, direction: 'right' }).kind).toBe('safe');
    expect(checkOneSidedRealDomain({ node: node('\\sqrt{x}'), target: 0, direction: 'left' }).kind).toBe('outside-domain');
    expect(checkOneSidedRealDomain({ node: node('\\arcsin(x)'), target: 1, direction: 'right' }).kind).toBe('outside-domain');
  });

  it('provides bounded interval readiness checks for CALC-INT1', () => {
    const pole = checkRealIntervalSafety({ node: node('\\frac{1}{x}'), lower: -1, upper: 1 });
    const endpoint = checkRealIntervalSafety({ node: node('\\ln(x)'), lower: 0, upper: 1 });
    const safe = checkRealIntervalSafety({ node: node('\\sqrt{x+1}'), lower: 0, upper: 1 });

    expect(pole.kind).toBe('unsafe');
    expect(pole.kind === 'unsafe' ? pole.value : undefined).toBe(0);
    expect(endpoint.kind).toBe('unsafe');
    expect(endpoint.kind === 'unsafe' ? endpoint.value : undefined).toBe(0);
    expect(safe.kind).toBe('safe');
  });
});
