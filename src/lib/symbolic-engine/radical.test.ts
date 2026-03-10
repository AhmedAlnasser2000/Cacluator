import { describe, expect, it } from 'vitest';
import { normalizeExactRadicalLatex } from './radical';

describe('normalizeExactRadicalLatex', () => {
  it('extracts supported symbolic square roots into absolute values in simplify mode', () => {
    const result = normalizeExactRadicalLatex('\\sqrt{x^2}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\vert x\\vert');
  });

  it('extracts supported odd-root monomials exactly', () => {
    const result = normalizeExactRadicalLatex('\\sqrt[3]{54x^4}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('3x\\sqrt[3]{2x}');
  });

  it('rationalizes numeric square-root binomial denominators', () => {
    const result = normalizeExactRadicalLatex('\\frac{1}{1+\\sqrt{2}}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toBe('\\sqrt{2}-1');
  });

  it('rationalizes supported symbolic square-root binomials and preserves conditions', () => {
    const result = normalizeExactRadicalLatex('\\frac{1}{x+\\sqrt{2}}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toContain('x^2-2');
    expect(result?.normalizedLatex).toContain('x-\\sqrt{2}');
    expect(result?.exactSupplementLatex).toEqual(['\\text{Conditions: } x+\\sqrt{2}\\ne0']);
  });

  it('keeps equation-mode square roots conservative to avoid abs rewrites before solve', () => {
    const result = normalizeExactRadicalLatex('\\sqrt{x^2}', 'equation');

    expect(result).toBeNull();
  });

  it('adds even-root domain conditions for root-in-variable binomials', () => {
    const result = normalizeExactRadicalLatex('\\frac{1}{\\sqrt{x}+1}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toContain('\\sqrt{x}');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ge0');
    expect(result?.exactSupplementLatex?.[0]).toContain('\\sqrt{x}+1\\ne0');
  });

  it('rationalizes supported root-in-binomial denominators and keeps binomial conditions', () => {
    const result = normalizeExactRadicalLatex('\\frac{1}{\\sqrt{x+1}+1}', 'simplify');

    expect(result).not.toBeNull();
    expect(result?.normalizedLatex).toContain('\\sqrt{x+1}');
    expect(result?.exactSupplementLatex?.[0]).toContain('x+1\\ge0');
    expect(result?.exactSupplementLatex?.[0]).toContain('\\sqrt{x+1}+1\\ne0');
  });

  it('rejects broader multivariable radicals in this bounded milestone', () => {
    const result = normalizeExactRadicalLatex('\\sqrt{x^2y^2}', 'simplify');

    expect(result).toBeNull();
  });
});
