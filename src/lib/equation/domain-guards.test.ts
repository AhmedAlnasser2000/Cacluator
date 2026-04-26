import { describe, expect, it } from 'vitest';
import {
  checkCandidateAgainstConstraints,
  equationToZeroFormLatex,
  exponentialDomainError,
  trigCarrierDomainError,
  trigSquareDomainError,
  validateResidual,
} from './domain-guards';

describe('equation domain guards', () => {
  it('normalizes equations into zero form', () => {
    expect(equationToZeroFormLatex('x=2')).toContain('-2');
  });

  it('reports bounded trig carrier domain errors', () => {
    expect(trigCarrierDomainError('sin', '2')).toContain('between -1 and 1');
    expect(trigSquareDomainError('-1')).toContain('between 0 and 1');
    expect(exponentialDomainError('-1')).toContain('always positive');
  });

  it('rejects candidates that violate explicit constraints or residual checks', () => {
    expect(
      checkCandidateAgainstConstraints(1, [{ kind: 'positive', expressionLatex: 'x-1' }]),
    ).toContain('non-positive');
    expect(
      checkCandidateAgainstConstraints(2, [{
        kind: 'expression-interval',
        expressionLatex: 'x',
        min: -1,
        minInclusive: true,
        max: 1,
        maxInclusive: true,
      }]),
    ).toContain('outside the permitted expression range');

    const residual = validateResidual('x-2', 1);
    expect(residual.kind).toBe('rejected');
  });

  it('evaluates trig residuals with the selected angle unit', () => {
    expect(validateResidual('\\sin\\left(x\\right)-1', 90, [], 'deg').kind).toBe('accepted');
    expect(validateResidual('\\sin\\left(x\\right)-1', 90, [], 'rad').kind).toBe('rejected');
    expect(validateResidual('\\sin\\left(x\\right)-1', 100, [], 'grad').kind).toBe('accepted');
  });
});
