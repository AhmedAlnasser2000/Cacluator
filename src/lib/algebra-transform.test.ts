import { describe, expect, it } from 'vitest';
import {
  applyEquationTransform,
  applyExpressionTransform,
  getEligibleEquationTransforms,
  getEligibleExpressionTransforms,
} from './algebra-transform';

describe('algebra-transform', () => {
  it('finds bounded calculate transforms for exact rational sums', () => {
    const actions = getEligibleExpressionTransforms('\\frac{1}{3}+\\frac{1}{6x}');

    expect(actions).toContain('combineFractions');
    expect(actions).toContain('useLCD');
    expect(actions).not.toContain('cancelFactors');
  });

  it('combines fractions in Calculate with preserved exclusions', () => {
    const result = applyExpressionTransform('\\frac{1}{3}+\\frac{1}{6x}', 'combineFractions');

    expect(result?.exactLatex).toBe('\\frac{2x+1}{6x}');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result?.transformBadges).toEqual(['Combine Fractions']);
  });

  it('cancels rational factors explicitly without losing exclusions', () => {
    const result = applyExpressionTransform('\\frac{x^2-1}{x^2-x}', 'cancelFactors');

    expect(result?.exactLatex).toBe('\\frac{x+1}{x}');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
    expect(result?.transformBadges).toEqual(['Cancel Factors']);
  });

  it('recognizes and applies explicit conjugate transforms', () => {
    const actions = getEligibleExpressionTransforms('\\frac{1}{1+\\sqrt{2}}');
    const result = applyExpressionTransform('\\frac{1}{1+\\sqrt{2}}', 'conjugate');

    expect(actions).toContain('rationalize');
    expect(actions).toContain('conjugate');
    expect(result?.exactLatex).toContain('\\sqrt{2}');
    expect(result?.transformBadges).toEqual(['Conjugate']);
  });

  it('shows equation-side LCD and factor transforms distinctly', () => {
    const actions = getEligibleEquationTransforms('\\frac{1}{x}+\\frac{1}{x+1}=1');
    const result = applyEquationTransform('\\frac{1}{x}+\\frac{1}{x+1}=1', 'useLCD');

    expect(actions).toContain('combineFractions');
    expect(actions).toContain('useLCD');
    expect(result?.exactLatex).toContain('=0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x+1\\ne0');
    expect(result?.transformBadges).toEqual(['Use LCD']);
  });

  it('widens calculate transform eligibility to binomial denominator families', () => {
    const actions = getEligibleExpressionTransforms('\\frac{1}{x^2+1}+\\frac{1}{x-1}');
    const result = applyExpressionTransform('\\frac{1}{x^2+1}+\\frac{1}{x-1}', 'useLCD');

    expect(actions).toContain('combineFractions');
    expect(actions).toContain('useLCD');
    expect(result?.exactLatex).toContain('(x-1)(x^2+1)');
    expect(result?.transformBadges).toEqual(['Use LCD']);
  });

  it('widens explicit radical transforms to binomial radicands', () => {
    const actions = getEligibleExpressionTransforms('\\frac{1}{\\sqrt{x+1}+1}');
    const result = applyExpressionTransform('\\frac{1}{\\sqrt{x+1}+1}', 'conjugate');

    expect(actions).toContain('rationalize');
    expect(actions).toContain('conjugate');
    expect(result?.exactLatex).toContain('\\sqrt{x+1}');
    expect(result?.transformBadges).toEqual(['Conjugate']);
  });

  it('cancels factors inside equation sides without auto-solving', () => {
    const result = applyEquationTransform('\\frac{x^2-1}{x-1}=0', 'cancelFactors');

    expect(result?.exactLatex).toBe('x+1=0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
    expect(result?.transformBadges).toEqual(['Cancel Factors']);
  });
});
