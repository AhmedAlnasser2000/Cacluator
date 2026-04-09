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
    expect(result?.transformSummaryLatex).toBe('6x');
  });

  it('cancels rational factors explicitly without losing exclusions', () => {
    const result = applyExpressionTransform('\\frac{x^2-1}{x^2-x}', 'cancelFactors');

    expect(result?.exactLatex).toBe('\\frac{x+1}{x}');
    expect(result?.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
    expect(result?.transformBadges).toEqual(['Cancel Factors']);
  });

  it('offers rewrite-root, rewrite-power, and change-base transforms when they materially change the form', () => {
    const rootActions = getEligibleExpressionTransforms('x^{1/6}');
    const powerActions = getEligibleExpressionTransforms('\\sqrt[3]{\\sqrt{x}}');
    const logActions = getEligibleExpressionTransforms('\\log_{4}(x)');

    expect(rootActions).toContain('rewriteAsRoot');
    expect(powerActions).toContain('rewriteAsPower');
    expect(logActions).toContain('changeBase');
    expect(rootActions).not.toContain('rewriteAsPower');
  });

  it('rewrites supported power and log forms explicitly in Calculate', () => {
    const asRoot = applyExpressionTransform('x^{1/6}', 'rewriteAsRoot');
    const asPower = applyExpressionTransform('\\sqrt[3]{\\sqrt{x}}', 'rewriteAsPower');
    const changeBase = applyExpressionTransform('\\log_{4}(x)', 'changeBase');

    expect(asRoot?.exactLatex).toBe('\\sqrt[6]{x}');
    expect(asRoot?.transformBadges).toEqual(['Rewrite as Root']);

    expect(asPower?.exactLatex).toBe('x^{\\frac{1}{6}}');
    expect(asPower?.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
    expect(asPower?.transformBadges).toEqual(['Rewrite as Power']);

    expect(changeBase?.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}');
    expect(changeBase?.transformBadges).toEqual(['Change Base']);
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
    expect(result?.transformSummaryLatex).toBe('x(x+1)');
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

  it('widens explicit radical transforms to affine-scaled and selected three-term denominator families', () => {
    const affineActions = getEligibleExpressionTransforms('\\frac{1}{2+\\sqrt{x}}');
    const affineResult = applyExpressionTransform('\\frac{1}{2+\\sqrt{x}}', 'conjugate');
    const threeTermActions = getEligibleExpressionTransforms('\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}');
    const threeTermResult = applyExpressionTransform('\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}', 'rationalize');

    expect(affineActions).toContain('rationalize');
    expect(affineActions).toContain('conjugate');
    expect(affineResult?.exactLatex).toBe('\\frac{2-\\sqrt{x}}{4-x}');
    expect(affineResult?.exactSupplementLatex).toEqual([
      '\\text{Exclusions: } \\sqrt{x}+2\\ne0',
      '\\text{Conditions: } x\\ge0',
    ]);

    expect(threeTermActions).toContain('rationalize');
    expect(threeTermActions).toContain('conjugate');
    expect(threeTermResult?.exactLatex).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})');
    expect(threeTermResult?.transformBadges).toEqual(['Rationalize']);
  });

  it('cancels factors inside equation sides without auto-solving', () => {
    const result = applyEquationTransform('\\frac{x^2-1}{x-1}=0', 'cancelFactors');

    expect(result?.exactLatex).toBe('x+1=0');
    expect(result?.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
    expect(result?.transformBadges).toEqual(['Cancel Factors']);
  });

  it('rewrites supported equation sides without auto-solving', () => {
    const asRoot = applyEquationTransform('x^{1/2}=3', 'rewriteAsRoot');
    const asPower = applyEquationTransform('\\sqrt{x}=3', 'rewriteAsPower');
    const changeBase = applyEquationTransform('\\log_{4}(x)=2', 'changeBase');

    expect(asRoot?.exactLatex).toBe('\\sqrt{x}=3');
    expect(asRoot?.transformBadges).toEqual(['Rewrite as Root']);

    expect(asPower?.exactLatex).toBe('x^{\\frac{1}{2}}=3');
    expect(asPower?.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
    expect(asPower?.transformBadges).toEqual(['Rewrite as Power']);

    expect(changeBase?.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}=2');
    expect(changeBase?.transformBadges).toEqual(['Change Base']);
  });
});
