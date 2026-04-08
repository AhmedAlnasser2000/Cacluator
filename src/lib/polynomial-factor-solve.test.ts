import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  factorBoundedPolynomialAst,
  solveBoundedPolynomialEquationAst,
} from './polynomial-factor-solve';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('polynomial-factor-solve', () => {
  it('solves bounded cubic families with rational roots exactly', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^3-6x^2+11x-6=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toBe('x\\in\\left\\{1, 2, 3\\right\\}');
    expect(result?.approxText).toContain('1');
    expect(result?.factorization.strategy).toBe('rational-root');
  });

  it('dedupes repeated rational roots in cubic solve output while preserving factor multiplicity internally', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^3-4x^2+5x-2=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toBe('x\\in\\left\\{1, 2\\right\\}');
    expect(result?.factorization.factors.some((factor) => factor.multiplicity > 1)).toBe(true);
  });

  it('solves supported quartic biquadratics exactly', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^4-5x^2+4=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('-2');
    expect(result?.exactLatex).toContain('-1');
    expect(result?.exactLatex).toContain('1');
    expect(result?.exactLatex).toContain('2');
    expect(result?.factorization.strategy).toBe('biquadratic');
  });

  it('solves quartics that factor into quadratics with exact radical roots', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^4+3x^3-x^2-4x+2=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('\\sqrt{3}');
    expect(result?.exactLatex).toContain('\\sqrt{5}');
    expect(result?.factorization.strategy).toBe('quadratic-pair');
  });

  it('handles exact-rational coefficients by clearing denominators before bounded factoring', () => {
    const result = solveBoundedPolynomialEquationAst(parse('\\frac{1}{2}x^4-\\frac{5}{2}x^2+2=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('-2');
    expect(result?.factorization.factorizedLatex).toContain('\\frac{1}{2}');
  });

  it('factors supported quartics even when the solve surface stays numeric-only for complex roots', () => {
    const factorization = factorBoundedPolynomialAst(parse('x^4+2x^2+1'));
    const solved = solveBoundedPolynomialEquationAst(parse('x^4+2x^2+1=0'), 'x');

    expect(factorization).not.toBeNull();
    expect(factorization?.factorizedLatex).toContain('x^2+1');
    expect(solved).toBeNull();
  });

  it('keeps unsupported irreducible cubic and quartic families out of the bounded exact path', () => {
    expect(solveBoundedPolynomialEquationAst(parse('x^3+x+1=0'), 'x')).toBeNull();
    expect(solveBoundedPolynomialEquationAst(parse('x^4+x+1=0'), 'x')).toBeNull();
    expect(factorBoundedPolynomialAst(parse('x^4+x+1'))).toBeNull();
  });
});
