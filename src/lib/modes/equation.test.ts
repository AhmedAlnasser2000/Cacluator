import { describe, expect, it } from 'vitest';
import { runEquationMode } from './equation';

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
    expect(result.error).toBe('No symbolic solution was found for x.');
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
});
