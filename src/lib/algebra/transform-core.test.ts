import { describe, expect, it } from 'vitest';
import {
  applyEquationTransformToLatex,
  applyExpressionTransformToLatex,
  getEligibleEquationTransformsForLatex,
  getEligibleExpressionTransformsForLatex,
  getTransformCoreLabel,
  listTransformCoreActions,
} from './transform-core';

describe('transform-core', () => {
  it('keeps the public transform action ordering stable', () => {
    expect(listTransformCoreActions()).toEqual([
      'rewriteAsRoot',
      'rewriteAsPower',
      'changeBase',
      'combineFractions',
      'cancelFactors',
      'useLCD',
      'rationalize',
      'conjugate',
    ]);
  });

  it('keeps transform labels stable', () => {
    expect(getTransformCoreLabel('useLCD')).toBe('Use LCD');
    expect(getTransformCoreLabel('conjugate')).toBe('Conjugate');
  });

  it('preserves representative expression transform behavior', () => {
    expect(getEligibleExpressionTransformsForLatex('\\frac{1}{3}+\\frac{1}{6x}')).toContain('combineFractions');

    const result = applyExpressionTransformToLatex('\\sqrt[3]{\\sqrt{x}}', 'rewriteAsPower');
    expect(result?.exactLatex).toBe('x^{\\frac{1}{6}}');
    expect(result?.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
    expect(result?.transformBadges).toEqual(['Rewrite as Power']);
  });

  it('preserves representative equation transform behavior', () => {
    expect(getEligibleEquationTransformsForLatex('\\frac{1}{x}+\\frac{1}{x+1}=1')).toContain('useLCD');

    const result = applyEquationTransformToLatex('\\frac{1}{x}+\\frac{1}{x+1}=1', 'useLCD');
    expect(result?.exactLatex).toContain('=0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result?.transformSummaryLatex).toBe('x(x+1)');
  });
});
