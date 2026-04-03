import { describe, expect, it } from 'vitest';
import { normalizeSymbolicDisplayLatex } from './symbolic-display';

const ROOT_PREFS = {
  symbolicDisplayMode: 'roots' as const,
  flattenNestedRootsWhenSafe: true,
};

const ROOT_PREFS_NO_FLATTEN = {
  symbolicDisplayMode: 'roots' as const,
  flattenNestedRootsWhenSafe: false,
};

const POWER_PREFS = {
  symbolicDisplayMode: 'powers' as const,
  flattenNestedRootsWhenSafe: true,
};

const AUTO_PREFS = {
  symbolicDisplayMode: 'auto' as const,
  flattenNestedRootsWhenSafe: true,
};

describe('normalizeSymbolicDisplayLatex', () => {
  it('flattens nested roots in root mode and prefers powers in power/auto modes', () => {
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{\\sqrt{x}}', ROOT_PREFS)).toBe('\\sqrt[6]{x}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{\\sqrt{x}}', POWER_PREFS)).toBe('x^{\\frac{1}{6}}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{\\sqrt{x}}', AUTO_PREFS)).toBe('x^{\\frac{1}{6}}');
  });

  it('normalizes sqrt(x^(1/3)) into a bounded root/power display family', () => {
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x^{1/3}}', ROOT_PREFS)).toBe('\\sqrt[6]{x}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x^{1/3}}', ROOT_PREFS_NO_FLATTEN)).toBe('\\sqrt{\\sqrt[3]{x}}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x^{1/3}}', POWER_PREFS)).toBe('x^{\\frac{1}{6}}');
  });

  it('normalizes awkward root-power forms without rewriting plain familiar roots', () => {
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{3}', ROOT_PREFS)).toBe('\\sqrt{x^{3}}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{3}', POWER_PREFS)).toBe('x^{\\frac{3}{2}}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{1/3}', ROOT_PREFS)).toBe('\\sqrt[6]{x}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{1/3}', ROOT_PREFS_NO_FLATTEN)).toBe('\\sqrt[3]{\\sqrt{x}}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{1/3}', POWER_PREFS)).toBe('x^{\\frac{1}{6}}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x}', POWER_PREFS)).toBe('\\sqrt{x}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{x}', AUTO_PREFS)).toBe('\\sqrt[3]{x}');
  });

  it('keeps light log cleanup bounded to notation normalization', () => {
    expect(normalizeSymbolicDisplayLatex('\\ln(x)', ROOT_PREFS)).toBe('\\ln\\left(x\\right)');
    expect(normalizeSymbolicDisplayLatex('\\log_{10}(x)', ROOT_PREFS)).toBe('\\log\\left(x\\right)');
    expect(normalizeSymbolicDisplayLatex('\\log_{e}(x)', ROOT_PREFS)).toBe('\\ln\\left(x\\right)');
    expect(normalizeSymbolicDisplayLatex('\\log_{4}(x)', ROOT_PREFS)).toBe('\\log_{4}\\left(x\\right)');
  });

  it('returns unsupported forms unchanged', () => {
    expect(normalizeSymbolicDisplayLatex('\\text{Conditions: } x\\ge0', ROOT_PREFS)).toBe('\\text{Conditions: } x\\ge0');
    expect(normalizeSymbolicDisplayLatex('x+1', POWER_PREFS)).toBe('x+1');
  });
});
