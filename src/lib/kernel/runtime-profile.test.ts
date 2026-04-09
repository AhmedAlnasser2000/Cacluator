import { describe, expect, it } from 'vitest';
import {
  canUseExpressionNumericFallback,
  getDefaultRuntimeExecutionProfile,
  getEquationExecutionBudget,
  getExpressionExecutionBudget,
  resolveRuntimeExecutionProfile,
} from './runtime-profile';

describe('runtime execution profiles', () => {
  it('resolves the same default profile for the current bounded hosts', () => {
    expect(resolveRuntimeExecutionProfile('expression-runtime')).toEqual(
      getDefaultRuntimeExecutionProfile(),
    );
    expect(resolveRuntimeExecutionProfile('equation-runtime')).toEqual(
      getDefaultRuntimeExecutionProfile(),
    );
  });

  it('keeps the default equation execution budget aligned with current guarded limits', () => {
    expect(getEquationExecutionBudget()).toEqual({
      maxRecursionDepth: 4,
      maxCompositionInversionDepth: 2,
      maxPeriodicReductionDepth: 2,
      maxRadicalTransformSteps: 2,
    });
  });

  it('keeps expression numeric fallback permissions aligned with the current host behavior', () => {
    const budget = getExpressionExecutionBudget();

    expect(canUseExpressionNumericFallback(budget, 'evaluate', 'evaluate-real-family')).toBe(true);
    expect(canUseExpressionNumericFallback(budget, 'simplify', 'symbolic-normalization-recovery')).toBe(true);
    expect(canUseExpressionNumericFallback(budget, 'factor', 'symbolic-normalization-recovery')).toBe(true);
    expect(canUseExpressionNumericFallback(budget, 'expand', 'symbolic-normalization-recovery')).toBe(true);
    expect(canUseExpressionNumericFallback(budget, 'solve', 'evaluate-real-family')).toBe(false);
    expect(canUseExpressionNumericFallback(budget, 'solve', 'symbolic-normalization-recovery')).toBe(false);
  });
});
