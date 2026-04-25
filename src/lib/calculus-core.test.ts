import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { backcheckAntiderivative } from './calculus-verification';
import {
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
  resolveIndefiniteIntegralFromAst,
  type BoxedLike,
} from './calculus-core';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex) as BoxedLike;
}

const finiteMessages = {
  mismatchError: 'Left and right behavior do not agree near the target.',
  unstableError: 'This limit could not be stabilized numerically in this milestone.',
  numericFallbackWarning: () => 'Symbolic limit unavailable; showing a numeric limit approximation.',
  oneSidedUnboundedError: (side: 'left' | 'right') =>
    `${side === 'left' ? 'Left-hand' : 'Right-hand'} limit appears unbounded near the target.`,
  oneSidedDomainError: (side: 'left' | 'right') =>
    `${side === 'left' ? 'Left-hand' : 'Right-hand'} behavior is outside the real domain near the target.`,
};

describe('calculus core', () => {
  it('resolves app-owned indefinite integrals before Compute Engine provenance', () => {
    const body = parse('\\frac{1}{1+x^2}');
    const computed = parse('\\int \\frac{1}{1+x^2}\\,dx').evaluate();

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      computed,
      unresolvedComputeEngine: false,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('inverse-trig');
    expect(result.antiderivativeBackcheck?.status).toMatch(/verified-/);
    expect(result.exactLatex).toContain('\\arctan');
  });

  it('keeps unsupported indefinite integrals on a controlled stop', () => {
    const body = parse('\\sin(x^2)');

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    });

    expect(result).toEqual({
      warnings: [],
      error: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    });
  });

  it('resolves common finite limits and directional numeric cases', () => {
    const sinOverX = evaluateFiniteLimitFromAst({
      body: parse('\\frac{\\sin(x)}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(sinOverX.error).toBeUndefined();
    expect(sinOverX.resultOrigin).toBe('rule-based-symbolic');
    expect(sinOverX.exactLatex).toBe('1');

    const logKnownForm = evaluateFiniteLimitFromAst({
      body: parse('\\frac{\\ln(1+x)}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(logKnownForm.error).toBeUndefined();
    expect(logKnownForm.resultOrigin).toBe('rule-based-symbolic');
    expect(logKnownForm.exactLatex).toBe('1');

    const mismatch = evaluateFiniteLimitFromAst({
      body: parse('\\frac{|x|}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(mismatch.error).toBe('Left and right behavior do not agree near the target.');

    const left = evaluateFiniteLimitFromAst({
      body: parse('\\frac{|x|}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'left',
      messages: finiteMessages,
    });
    const right = evaluateFiniteLimitFromAst({
      body: parse('\\frac{|x|}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'right',
      messages: finiteMessages,
    });

    expect(left.exactLatex).toBe('-1');
    expect(right.exactLatex).toBe('1');
  });

  it('classifies clear one-sided finite-domain gaps', () => {
    const sqrtBoundary = evaluateFiniteLimitFromAst({
      body: parse('\\sqrt{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(sqrtBoundary.error).toBe('Left-hand behavior is outside the real domain near the target.');

    const right = evaluateFiniteLimitFromAst({
      body: parse('\\sqrt{x}').json,
      variable: 'x',
      target: 0,
      direction: 'right',
      messages: finiteMessages,
    });

    expect(right.error).toBeUndefined();
    expect(right.exactLatex).toBe('0');
    expect(right.resultOrigin).toBe('symbolic');
  });

  it('aligns infinite-limit heuristic provenance as rule-based symbolic', () => {
    const result = evaluateInfiniteLimitFromAst({
      body: parse('\\frac{3x^2+1}{2x^2-5}').json,
      variable: 'x',
      targetKind: 'posInfinity',
      messages: {
        targetLabel: () => '+infinity',
        unstableError: 'This limit could not be stabilized numerically in Advanced Calc.',
        numericFallbackWarning: 'Symbolic limit unavailable; showing a numeric infinite-target approximation.',
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('1.5');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
  });

  it('backchecks antiderivatives with exact proof before numeric confidence', () => {
    const exact = backcheckAntiderivative({
      antiderivativeLatex: '\\frac{x^3}{3}',
      integrand: parse('x^2').json,
      variable: 'x',
    });
    expect(exact.status).toBe('verified-exact');

    const numericConfidence = backcheckAntiderivative({
      antiderivativeLatex: '\\ln\\left|x\\right|',
      integrand: parse('\\frac{1}{x}').json,
      variable: 'x',
    });
    expect(numericConfidence.status).toBe('verified-numeric-confidence');
    expect(numericConfidence.reason).toContain('confidence');

    const mismatch = backcheckAntiderivative({
      antiderivativeLatex: 'x^3',
      integrand: parse('x^2').json,
      variable: 'x',
    });
    expect(mismatch.status).toBe('not-verified');
  });
});
