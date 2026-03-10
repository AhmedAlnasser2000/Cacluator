import { describe, expect, it } from 'vitest';
import { runEquationAlgebraTransform, runEquationMode } from './equation';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function makeRequest() {
  return {
    equationLatex: 'x^2-5x+6=0',
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    system2,
    system3,
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };
}

describe('runEquationMode', () => {
  it('solves symbolic equations in x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '5x+6=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('\\frac');
    expect(result.approxText).toContain('x ~=');
  });

  it('rejects non-equation symbolic input', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2+2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('Enter an equation containing x.');
  });

  it('rejects equations without x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2+2=4',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('Equation mode solves for x. Enter x in the equation.');
  });

  it('keeps symbolic mode symbolic-only for complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported symbolic solve families for this milestone.');
  });

  it('returns a controlled error for inequality relations in symbolic mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\ge2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('only = equations');
  });

  it('solves linear 2x2 systems', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      equationLatex: '',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=1');
    expect(result.exactLatex).toContain('y=2');
  });

  it('uses symbolic results for guided quadratic equations when available', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('falls back numerically for guided quadratic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [1, 2, 2],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('-1 - i');
    expect(result.approxText).toContain('-1 + i');
    expect(result.warnings).toContain('Symbolic solve unavailable; showing numeric roots.');
  });

  it('solves cubic coefficient entry symbolically', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'cubic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('falls back numerically for guided quartic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
      quarticCoefficients: [5, -6, 5, 4, 1],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('0.870267 - 1.036465i');
    expect(result.approxText).toContain('-0.270267 + 0.190128i');
  });

  it('rejects a zero leading quadratic coefficient', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [0, 2, 1],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('non-zero');
  });

  it('reduces embedded derivatives before solving for x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '12+\\frac{d}{dx}(5x)+6x=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('-2');
    const normalized = result.resolvedInputLatex?.replaceAll(' ', '') ?? '';
    expect(normalized).toContain('6x');
    expect(normalized).toContain('17');
    expect(normalized).toContain('=5');
    expect(result.plannerBadges).toContain('Reduced Derivative');
  });

  it('uses the shared bounded trig backend for symbolic trig equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(2x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('solves selected trig rewrite families from Equation mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Rewrite');
    expect(result.solveSummaryText).toContain('double-angle');
  });

  it('normalizes bounded rational equations before solving and carries exclusions', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{3}+\\frac{1}{6x}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{1}{4}');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0']);
    expect(result.resolvedInputLatex).toBe('\\frac{2x+1}{6x}=1');
  });

  it('keeps denominator exclusions when solving rational-zero equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{x^2-1}{x-1}=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-1');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x-1\\ne0']);
    expect(result.resolvedInputLatex).toBe('x+1=0');
  });

  it('carries radical domain conditions through symbolic solve prep', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{\\sqrt{x}}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ge0');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
  });

  it('preserves radical denominator conditions on unresolved symbolic equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x+\\sqrt{2}}=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+\\sqrt{2}\\ne0']);
  });

  it('solves bounded rational equations by clearing the LCD before guarded recursion', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('LCD Clear');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.exactSupplementLatex?.[0]).toContain('x+1\\ne0');
  });

  it('solves affine-radicand equations through bounded radical isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+1}=x-1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=3');
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('solves bounded trig squares through exact branch splitting', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin^2\\left(x\\right)=\\frac{1}{4}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Square Split');
    expect(result.exactLatex).toContain('x\\in');
  });

  it('blocks unsupported indefinite integrals before solve', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\int x\\,dx+x=3',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('indefinite integral');
    expect(result.plannerBadges).toContain('Hard Stop');
  });

  it('runs explicit equation transforms without auto-solving the transformed equation', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
  });

  it('widens explicit equation transforms to binomial denominator families', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x^2+1}+\\frac{1}{x-1}=0',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x^2+x=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('(x-1)(x^2+1)');
    expect(result.exactSupplementLatex?.[0]).toContain('x^2+1\\ne0');
  });

  it('solves bounded conjugate families through the shared symbolic backend', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
  });
});
