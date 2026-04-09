import { describe, expect, it } from 'vitest';
import { normalizeExactRadicalLatex } from './radical';

function stripFences(latex: string | undefined) {
  return latex?.replaceAll('\\left', '').replaceAll('\\right', '').replace(/\s+/g, ' ').trim();
}

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

  it('collapses perfect-square quadratic radicands in simplify mode', () => {
    const repeatedLinear = normalizeExactRadicalLatex('\\sqrt{x^2+2x+1}', 'simplify');
    const scaledLinear = normalizeExactRadicalLatex('\\sqrt{4x^2+4x+1}', 'simplify');
    const shiftedSquare = normalizeExactRadicalLatex('\\sqrt{9(x+1)^2}', 'simplify');
    const rationalSquare = normalizeExactRadicalLatex('\\sqrt{\\frac{(2x+1)^2}{4}}', 'simplify');

    expect(stripFences(repeatedLinear?.normalizedLatex)).toBe('\\vert x+1\\vert');
    expect(stripFences(scaledLinear?.normalizedLatex)).toBe('\\vert2x+1\\vert');
    expect(stripFences(shiftedSquare?.normalizedLatex)).toBe('3\\vert x+1\\vert');
    expect(stripFences(rationalSquare?.normalizedLatex)).toContain('\\vert2x+1\\vert');
    expect(stripFences(rationalSquare?.normalizedLatex)).toContain('2');
  });

  it('denests bounded constant nested square roots in simplify mode', () => {
    const simplePlus = normalizeExactRadicalLatex('\\sqrt{3+2\\sqrt{2}}', 'simplify');
    const twoTermPlus = normalizeExactRadicalLatex('\\sqrt{5+2\\sqrt{6}}', 'simplify');
    const minusCase = normalizeExactRadicalLatex('\\sqrt{3-2\\sqrt{2}}', 'simplify');

    expect(stripFences(simplePlus?.normalizedLatex)).toBe('1+\\sqrt{2}');
    expect(stripFences(twoTermPlus?.normalizedLatex)).toBe('\\sqrt{2}+\\sqrt{3}');
    expect(stripFences(minusCase?.normalizedLatex)).toBe('\\sqrt{2}-1');
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

  it('widens bounded two-term square-root rationalization to affine-scaled denominators', () => {
    const result = normalizeExactRadicalLatex('\\frac{1}{2+\\sqrt{x}}', 'simplify');

    expect(result).not.toBeNull();
    expect(stripFences(result?.normalizedLatex)).toBe('\\frac{2-\\sqrt{x}}{4-x}');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ge0');
    expect(result?.exactSupplementLatex?.[0]).toContain('\\sqrt{x}+2\\ne0');
  });

  it('rationalizes bounded two-radical denominators in simplify mode', () => {
    const sum = normalizeExactRadicalLatex('\\frac{1}{\\sqrt{x+1}+\\sqrt{x}}', 'simplify');
    const difference = normalizeExactRadicalLatex('\\frac{1}{\\sqrt{x+1}-\\sqrt{x}}', 'simplify');

    expect(sum).not.toBeNull();
    expect(stripFences(sum?.normalizedLatex)).toBe('\\sqrt{x+1}-\\sqrt{x}');
    expect(sum?.exactSupplementLatex?.[0]).toContain('x+1\\ge0');
    expect(sum?.exactSupplementLatex?.[0]).toContain('x\\ge0');
    expect(sum?.exactSupplementLatex?.[0]).toContain('\\sqrt{x}');
    expect(sum?.exactSupplementLatex?.[0]).toContain('\\sqrt{x+1}');
    expect(sum?.exactSupplementLatex?.[0]).toContain('\\ne0');

    expect(difference).not.toBeNull();
    expect(stripFences(difference?.normalizedLatex)).toContain('\\sqrt{x}');
    expect(stripFences(difference?.normalizedLatex)).toContain('\\sqrt{x+1}');
    expect(difference?.exactSupplementLatex?.[0]).toContain('x+1\\ge0');
    expect(difference?.exactSupplementLatex?.[0]).toContain('x\\ge0');
    expect(difference?.exactSupplementLatex?.[0]).toContain('\\sqrt{x}');
    expect(difference?.exactSupplementLatex?.[0]).toContain('\\sqrt{x+1}');
    expect(difference?.exactSupplementLatex?.[0]).toContain('\\ne0');
  });

  it('rationalizes selected bounded three-term square-root denominators with one residual cleanup', () => {
    const result = normalizeExactRadicalLatex('\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}', 'simplify');

    expect(result).not.toBeNull();
    expect(stripFences(result?.normalizedLatex)).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})');
    expect(result?.exactSupplementLatex).toEqual([]);
  });

  it('rejects broader multivariable radicals in this bounded milestone', () => {
    const result = normalizeExactRadicalLatex('\\sqrt{x^2y^2}', 'simplify');

    expect(result).toBeNull();
  });

  it('keeps expanded perfect-square quadratics conservative in equation mode', () => {
    const result = normalizeExactRadicalLatex('\\sqrt{x^2+2x+1}', 'equation');

    expect(result).toBeNull();
  });

  it('keeps variable nested radicals conservative in simplify mode', () => {
    const result = normalizeExactRadicalLatex('\\sqrt{x+\\sqrt{x}}', 'simplify');

    expect(result?.changed).toBe(false);
    expect(result?.normalizedLatex).toBe('\\sqrt{x+\\sqrt{x}}');
    expect(result?.exactSupplementLatex).toContain('\\text{Conditions: } x\\ge0');
  });
});
