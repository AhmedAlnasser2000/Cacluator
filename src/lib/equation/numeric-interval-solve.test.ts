import { describe, expect, it } from 'vitest';
import { runNumericIntervalSolve } from './numeric-interval-solve';

describe('runNumericIntervalSolve', () => {
  it('finds bracketed numeric roots on an interval', () => {
    const result = runNumericIntervalSolve('\\cos\\left(x\\right)=x', {
      start: '0',
      end: '1',
      subdivisions: 256,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(0.73);
    expect(result.roots[0]).toBeLessThan(0.75);
    expect(result.method).toContain('Bracket-first');
  });

  it('respects degree angle mode for direct trig equations', () => {
    const result = runNumericIntervalSolve('\\sin\\left(x\\right)=\\frac{1}{2}', {
      start: '20',
      end: '40',
      subdivisions: 256,
    }, [], 'deg');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(29.9);
    expect(result.roots[0]).toBeLessThan(30.1);
  });

  it('respects grad angle mode for direct trig equations', () => {
    const result = runNumericIntervalSolve('\\sin\\left(x\\right)=\\frac{1}{2}', {
      start: '30',
      end: '40',
      subdivisions: 256,
    }, [], 'grad');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(33.2);
    expect(result.roots[0]).toBeLessThan(33.5);
  });

  it('recovers an even-multiplicity root without a sign change when residual-verified', () => {
    const result = runNumericIntervalSolve('\\left(x-0.3\\right)^2=0', {
      start: '0',
      end: '1',
      subdivisions: 64,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(0.29);
    expect(result.roots[0]).toBeLessThan(0.31);
    expect(result.summaryText).toContain('Recovered');
  });

  it('rejects invalid intervals', () => {
    const result = runNumericIntervalSolve('x=0', {
      start: '1',
      end: '0',
      subdivisions: 256,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('Start < End');
  });

  it('returns actionable no-root guidance for poor intervals', () => {
    const result = runNumericIntervalSolve('\\cos\\left(x\\right)=x', {
      start: '3',
      end: '20',
      subdivisions: 512,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('widening the interval');
    expect(result.error).toContain('shifting the interval center');
  });

  it('adds unit-aware branch guidance for direct trig composition failures in degree mode', () => {
    const result = runNumericIntervalSolve('\\tan\\left(\\ln\\left(x+1\\right)\\right)=1', {
      start: '0',
      end: '10',
      subdivisions: 512,
    }, [], 'deg');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('ln(x+1) stays about in');
    expect(result.error).toContain('45 deg + 180 deg * k');
  });

  it('adds unit-aware branch guidance for direct trig composition failures in grad mode', () => {
    const result = runNumericIntervalSolve('\\tan\\left(\\ln\\left(x+1\\right)\\right)=1', {
      start: '0',
      end: '10',
      subdivisions: 512,
    }, [], 'grad');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('ln(x+1) stays about in');
    expect(result.error).toContain('50 grad + 200 grad * k');
  });

  it('adds abs-branch guidance for recognized direct absolute-value families', () => {
    const result = runNumericIntervalSolve('\\left|x+1\\right|=e^x', {
      start: '5',
      end: '6',
      subdivisions: 256,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('absolute-value family splits into');
    expect(result.error).toContain('x+1=\\exponentialE^{x}');
  });

  it('flags intervals whose recognized abs magnitude stays negative', () => {
    const result = runNumericIntervalSolve('\\left|x+1\\right|=-x-10', {
      start: '0',
      end: '1',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('requires');
    expect(result.error).toContain('\\ge0');
    expect(result.error).toContain('stays negative across the chosen interval');
  });

  it('flags intervals for single-branch abs families', () => {
    const result = runNumericIntervalSolve('\\left|x+1\\right|=0', {
      start: '1',
      end: '2',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('single branch');
    expect(result.error).toContain('x+1=0');
  });
});
