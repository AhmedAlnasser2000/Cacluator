import { describe, expect, it } from 'vitest';
import { normalizeExactRationalLatex } from './rational';

describe('normalizeExactRationalLatex', () => {
  it('combines exact fractions into a single bounded rational form', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{3}+\\frac{1}{6x}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\frac{2x+1}{6x}');
    expect(result?.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0']);
  });

  it('preserves exact exclusions from original denominators', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{x+1}+\\frac{1}{x-1}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toContain('\\frac{2x}');
    expect(result?.normalizedLatex).toContain('(x-1)(x+1)');
    expect(result?.exactSupplementLatex[0]).toContain('x-1\\ne0');
    expect(result?.exactSupplementLatex[0]).toContain('x+1\\ne0');
  });

  it('factors numerator and denominator separately without cancellation in factor mode', () => {
    const result = normalizeExactRationalLatex('\\frac{x^2-1}{x^2-x}', 'factor');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\frac{(x-1)(x+1)}{x(x-1)}');
    expect(result?.exactSupplementLatex[0]).toContain('x\\ne0');
    expect(result?.exactSupplementLatex[0]).toContain('x-1\\ne0');
  });

  it('rejects multivariable rational expressions for this bounded milestone', () => {
    const result = normalizeExactRationalLatex('\\frac{1}{x}+\\frac{1}{y}', 'simplify');

    expect(result).toBeNull();
  });

  it('rejects decimal-driven rational inputs outside the exact-safe path', () => {
    const result = normalizeExactRationalLatex('0.5+\\frac{1}{x}', 'simplify');

    expect(result).toBeNull();
  });
});
