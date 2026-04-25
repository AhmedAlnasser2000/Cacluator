import { describe, expect, it } from 'vitest';
import {
  evaluateAdvancedFiniteLimit,
  evaluateAdvancedInfiniteLimit,
} from './limits';

describe('advanced calc limits', () => {
  it('handles common finite removable singularities', () => {
    const sinOverX = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{\\sin(x)}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(sinOverX.error).toBeUndefined();
    expect(Number(sinOverX.approxText)).toBeCloseTo(1, 3);

    const cosCase = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{1-\\cos(x)}{x^2}',
      target: '0',
      direction: 'two-sided',
    });
    expect(cosCase.error).toBeUndefined();
    expect(Number(cosCase.approxText)).toBeCloseTo(0.5, 2);

    const logKnownForm = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{\\ln(1+x)}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(logKnownForm.error).toBeUndefined();
    expect(logKnownForm.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(logKnownForm.approxText)).toBeCloseTo(1, 6);
  });

  it('handles directional mismatch and unbounded cases', () => {
    const mismatch = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{|x|}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(mismatch.error).toBe('Left and right behavior do not agree near the target.');

    const unbounded = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0',
      direction: 'left',
    });
    expect(unbounded.error).toContain('Left-hand');

    const domainGap = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\sqrt{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(domainGap.error).toContain('outside the real domain');
  });

  it('handles infinite target limits', () => {
    const sameDegree = evaluateAdvancedInfiniteLimit({
      bodyLatex: '\\frac{3x^2+1}{2x^2-5}',
      targetKind: 'posInfinity',
    });
    expect(sameDegree.error).toBeUndefined();
    expect(sameDegree.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(sameDegree.approxText)).toBeCloseTo(1.5, 6);

    const toZero = evaluateAdvancedInfiniteLimit({
      bodyLatex: '\\frac{x+1}{x^2+5}',
      targetKind: 'posInfinity',
    });
    expect(toZero.error).toBeUndefined();
    expect(Number(toZero.approxText)).toBeCloseTo(0, 2);

    const unbounded = evaluateAdvancedInfiniteLimit({
      bodyLatex: '\\frac{e^x}{x^3}',
      targetKind: 'posInfinity',
    });
    expect(unbounded.error).toContain('unbounded');
  });
});
